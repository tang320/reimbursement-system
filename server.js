const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3001;

// 配置CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置静态文件服务
app.use(express.static(__dirname));

// 云存储配置示例（实际项目中使用）
// const OSS = require('ali-oss');
// const client = new OSS({
//   region: 'your-region',
//   accessKeyId: 'your-access-key-id',
//   accessKeySecret: 'your-access-key-secret',
//   bucket: 'your-bucket-name'
// });

// 配置文件存储（本地存储作为备用）
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userId = req.body.userId || 'anonymous';
        const moduleId = req.body.moduleId || 'other';
        const uploadPath = path.join(__dirname, 'uploads', userId, moduleId);
        
        // 确保目录存在
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 七牛云存储上传函数
async function uploadToCloudStorage(filePath, fileName) {
    try {
        // 七牛云配置
        const qiniu = require('qiniu');
        const accessKey = '7bY2y_9rorBou27jnh_AEgiV8zrk95phZIn0QSdJ';
        const secretKey = 'b3vNsvXwjJpVDLyOpRDHnoTANQZCosSj8Q_43aGE';
        const bucket = 'reimbursement-system';
        
        // 生成上传凭证
        const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
        const options = {
           scope: bucket,
           expires: 7200
         };
         const putPolicy = new qiniu.rs.PutPolicy(options);
        const uploadToken = putPolicy.uploadToken(mac);
        
        // 配置上传
        const config = new qiniu.conf.Config();
        config.zone = qiniu.zone.Zone_z0; // 华东区域
        const formUploader = new qiniu.form_up.FormUploader(config);
        const putExtra = new qiniu.form_up.PutExtra();
        
        // 上传文件
        return new Promise((resolve, reject) => {
          formUploader.putFile(uploadToken, fileName, filePath, putExtra, (respErr, respBody, respInfo) => {
            if (respErr) {
              reject(respErr);
            } else {
              if (respInfo.statusCode === 200) {
                resolve({
                  success: true,
                  url: `https://t9lrzq98r.hn-bkt.clouddn.com/${fileName}`
                });
              } else {
                resolve({
                  success: false,
                  message: respBody.error
                });
              }
            }
          });
        });
    } catch (error) {
        console.error('云存储上传失败：', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// 模拟用户数据
const users = [
    { username: 'admin', password: 'fushi315315', isAdmin: true },
    { username: 'user1', password: 'password1', isAdmin: false },
    { username: 'user2', password: 'password2', isAdmin: false }
];

// 登录路由
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        res.json({
            success: true,
            user: {
                username: user.username,
                isAdmin: user.isAdmin
            }
        });
    } else {
        res.json({ success: false, message: '用户名或密码错误' });
    }
});

// 文件上传路由
app.post('/api/upload', upload.array('files'), async (req, res) => {
    const files = req.files;
    const userId = req.body.userId;
    const moduleId = req.body.moduleId;
    
    if (files.length > 0) {
        // 上传文件到云存储
        const cloudUploadPromises = files.map(async (file) => {
            const cloudFileName = `${userId}/${moduleId}/${path.basename(file.path)}`;
            const cloudResult = await uploadToCloudStorage(file.path, cloudFileName);
            return {
                name: file.originalname,
                path: file.path,
                cloudUrl: cloudResult.url,
                size: file.size
            };
        });
        
        const uploadedFiles = await Promise.all(cloudUploadPromises);
        
        res.json({
            success: true,
            files: uploadedFiles
        });
    } else {
        res.json({ success: false, message: '没有文件被上传' });
    }
});

// 文件下载路由
app.get('/api/download/:userId/:moduleId/:filename', (req, res) => {
    const { userId, moduleId, filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', userId, moduleId, filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ success: false, message: '文件不存在' });
    }
});

// 文件组下载路由
app.get('/api/download-group/:userId/:moduleId', (req, res) => {
    const { userId, moduleId } = req.params;
    const { nameDate } = req.query;
    const modulePath = path.join(__dirname, 'uploads', userId, moduleId);
    
    if (fs.existsSync(modulePath)) {
        // 实际项目中，这里应该实现文件打包功能
        // 例如：使用archiver库创建zip文件
        
        res.json({
            success: true,
            message: `文件组下载已触发：${moduleId}${nameDate ? '_' + nameDate : ''}.zip`
        });
    } else {
        res.status(404).json({ success: false, message: '文件组不存在' });
    }
});

// 获取存储信息路由
app.get('/api/storage/:userId', (req, res) => {
    const { userId } = req.params;
    const userPath = path.join(__dirname, 'uploads', userId);
    
    let totalSize = 0;
    if (fs.existsSync(userPath)) {
        const files = fs.readdirSync(userPath, { recursive: true });
        files.forEach(file => {
            const filePath = path.join(userPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        });
    }
    
    res.json({
        usedStorage: totalSize,
        totalStorage: 102400 * 1024 * 1024 // 100GB
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 确保上传目录存在
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}