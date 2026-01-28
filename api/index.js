const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// 配置CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
        const uploadPath = path.join(__dirname, '..', 'uploads', userId, moduleId);
        
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

// 模拟云存储上传函数
async function uploadToCloudStorage(filePath, fileName) {
    // 实际项目中，这里应该实现真实的云存储上传逻辑
    // 例如：await client.put(fileName, filePath);
    console.log(`模拟上传文件到云存储：${fileName}`);
    return {
        success: true,
        url: `https://cloud-storage.example.com/${fileName}`
    };
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
    const filePath = path.join(__dirname, '..', 'uploads', userId, moduleId, filename);
    
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
    const modulePath = path.join(__dirname, '..', 'uploads', userId, moduleId);
    
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
    const userPath = path.join(__dirname, '..', 'uploads', userId);
    
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

// 导出Express应用（Vercel Serverless函数）
module.exports = app;