new Vue({
    el: '#app',
    data: {
        isLoggedIn: false,
        currentUser: '',
        isAdmin: false,
        username: '',
        password: '',
        selectedModule: null,
        modules: [
            { id: 'travel', name: '差旅费' },
            { id: 'processing', name: '加工费' },
            { id: 'materials', name: '材料费' },
            { id: 'patent', name: '专利费' },
            { id: 'taxi', name: '打车费' },
            { id: 'express', name: '快递费' }
        ],
        fileTypes: {
            travel: [
                { id: 'invoice', name: '发票', accept: '.pdf' },
                { id: 'payment', name: '支付记录', accept: '.jpg,.jpeg,.png' },
                { id: 'order', name: '订单', accept: '.jpg,.jpeg,.png,.pdf' },
                { id: 'contract', name: '合同', accept: '.pdf' }
            ],
            processing: [
                { id: 'invoice', name: '发票', accept: '.pdf' },
                { id: 'contract', name: '合同', accept: '.pdf' }
            ],
            materials: [
                { id: 'invoice', name: '发票', accept: '.pdf' },
                { id: 'photo', name: '实物照片', accept: '.docx,.doc,.pdf' },
                { id: 'contract', name: '合同', accept: '.pdf' }
            ],
            patent: [
                { id: 'invoice', name: '发票', accept: '.pdf' },
                { id: 'contract', name: '合同', accept: '.pdf' },
                { id: 'payment', name: '支付记录', accept: '.jpg,.jpeg,.png' }
            ],
            taxi: [
                { id: 'invoice', name: '发票', accept: '.pdf' },
                { id: 'itinerary', name: '行程单', accept: '.pdf' }
            ],
            express: [
                { id: 'invoice', name: '发票', accept: '.pdf' },
                { id: 'details', name: '明细', accept: '.pdf' }
            ]
        },
        uploadedFiles: {},
        nameDate: '',
        deadlineOption: 'none',
        deadlineDate: '',
        showStorage: false,
        usedStorage: 0,
        totalStorage: 102400, // 100GB
        fileGroups: {},
        // 模拟用户数据
        users: [
            { username: 'admin', password: 'fushi315315', isAdmin: true },
            { username: 'user1', password: 'password1', isAdmin: false },
            { username: 'user2', password: 'password2', isAdmin: false }
        ]
    },
    methods: {
        login() {
            // 本地登录验证（模拟）
            const user = this.users.find(u => u.username === this.username && u.password === this.password);
            if (user) {
                this.isLoggedIn = true;
                this.currentUser = user.username;
                this.isAdmin = user.isAdmin;
                this.username = '';
                this.password = '';
                // 初始化上传文件存储
                this.uploadedFiles = {};
                // 初始化文件组存储
                if (!this.fileGroups[this.currentUser]) {
                    this.fileGroups[this.currentUser] = {};
                }
                // 登录成功提示
                alert('登录成功！');
            } else {
                alert('用户名或密码错误');
            }
        },
        logout() {
            this.isLoggedIn = false;
            this.currentUser = '';
            this.isAdmin = false;
            this.selectedModule = null;
            this.uploadedFiles = {};
        },
        selectModule(moduleId) {
            this.selectedModule = moduleId;
            // 初始化当前模块的文件存储
            if (!this.uploadedFiles[moduleId]) {
                this.uploadedFiles[moduleId] = {};
                this.fileTypes[moduleId].forEach(type => {
                    this.uploadedFiles[moduleId][type.id] = [];
                });
            }
        },
        getModuleName(moduleId) {
            const module = this.modules.find(m => m.id === moduleId);
            return module ? module.name : '';
        },
        getFileTypes(moduleId) {
            return this.fileTypes[moduleId] || [];
        },
        handleFileUpload(moduleId, fileTypeId, event) {
            const files = event.target.files;
            if (files.length > 0) {
                if (!this.uploadedFiles[moduleId]) {
                    this.uploadedFiles[moduleId] = {};
                }
                if (!this.uploadedFiles[moduleId][fileTypeId]) {
                    this.uploadedFiles[moduleId][fileTypeId] = [];
                }
                for (let i = 0; i < files.length; i++) {
                    this.uploadedFiles[moduleId][fileTypeId].push(files[i]);
                }
                // 更新存储使用情况
                this.updateStorageUsage();
            }
        },
        removeFile(moduleId, fileTypeId, index) {
            if (this.uploadedFiles[moduleId] && this.uploadedFiles[moduleId][fileTypeId]) {
                this.uploadedFiles[moduleId][fileTypeId].splice(index, 1);
                // 更新存储使用情况
                this.updateStorageUsage();
            }
        },
        async saveFileGroup() {
            if (!this.selectedModule) return;
            
            // 本地保存文件组（确保数据持久化）
            const groupData = {
                module: this.selectedModule,
                moduleName: this.getModuleName(this.selectedModule),
                nameDate: this.nameDate,
                deadlineOption: this.deadlineOption,
                deadlineDate: this.deadlineDate,
                files: this.uploadedFiles[this.selectedModule],
                timestamp: new Date().toISOString()
            };
            
            if (!this.fileGroups[this.currentUser]) {
                this.fileGroups[this.currentUser] = {};
            }
            if (!this.fileGroups[this.currentUser][this.selectedModule]) {
                this.fileGroups[this.currentUser][this.selectedModule] = [];
            }
            
            this.fileGroups[this.currentUser][this.selectedModule].push(groupData);
            
            // 保存到本地存储（持久化）
            try {
                localStorage.setItem('fileGroups', JSON.stringify(this.fileGroups));
                alert('文件组保存成功！');
            } catch (error) {
                console.error('保存到本地存储失败：', error);
                alert('文件组保存成功，但本地存储失败，可能会影响数据持久化');
            }
            
            // 同时尝试上传到后端服务器（可选）
            try {
                const formData = new FormData();
                formData.append('userId', this.currentUser);
                formData.append('moduleId', this.selectedModule);
                
                // 添加所有文件
                if (this.uploadedFiles[this.selectedModule]) {
                    Object.values(this.uploadedFiles[this.selectedModule]).forEach(files => {
                        files.forEach(file => {
                            formData.append('files', file);
                        });
                    });
                }
                
                // 真实上传请求（Vercel部署时使用）
                fetch('https://reimbursement-system.vercel.app/api/upload', {
                    method: 'POST',
                    body: formData
                }).then(response => response.json())
                  .then(result => {
                      if (!result.success) {
                          console.warn('后端上传失败：', result.message);
                      } else {
                          console.log('后端上传成功：', result);
                      }
                  }).catch(error => {
                      console.warn('后端上传失败：', error);
                  });
            } catch (error) {
                console.warn('后端上传失败：', error);
            }
            
            // 重置当前模块的文件
            this.uploadedFiles[this.selectedModule] = {};
            this.fileTypes[this.selectedModule].forEach(type => {
                this.uploadedFiles[this.selectedModule][type.id] = [];
            });
            this.nameDate = '';
            this.deadlineOption = 'none';
            this.deadlineDate = '';
        },
        downloadFileGroup() {
            if (!this.selectedModule) return;
            
            // 检查是否有文件
            if (!this.uploadedFiles[this.selectedModule]) {
                alert('没有文件可以下载');
                return;
            }
            
            // 计算文件大小
            let totalSize = 0;
            let hasFiles = false;
            if (this.uploadedFiles[this.selectedModule]) {
                Object.values(this.uploadedFiles[this.selectedModule]).forEach(files => {
                    if (files.length > 0) {
                        hasFiles = true;
                    }
                    files.forEach(file => {
                        totalSize += file.size;
                    });
                });
            }
            
            if (!hasFiles) {
                alert('没有文件可以下载');
                return;
            }
            
            // 模拟下载功能
            const moduleName = this.getModuleName(this.selectedModule);
            const fileName = `${moduleName}${this.nameDate ? '_' + this.nameDate : ''}.zip`;
            
            alert(`文件组已准备就绪，即将下载：${fileName}\n文件大小：${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
            
            // 实际项目中，这里应该实现真实的文件打包和下载功能
            // 例如：window.location.href = `https://reimbursement-system.vercel.app/api/download-group/${this.currentUser}/${this.selectedModule}?nameDate=${this.nameDate}`;
        },
        downloadFile(moduleId, fileTypeId, index) {
            // 单文件下载功能
            const file = this.uploadedFiles[moduleId]?.[fileTypeId]?.[index];
            if (file) {
                alert(`文件已准备就绪，即将下载：${file.name}\n文件大小：${(file.size / (1024 * 1024)).toFixed(2)} MB`);
                
                // 创建临时下载链接
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(file);
                downloadLink.download = file.name;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                // 实际项目中，这里应该实现真实的文件下载功能
                // 例如：window.location.href = `https://reimbursement-system.vercel.app/api/download/${this.currentUser}/${moduleId}/${file.name}`;
            } else {
                alert('文件不存在，无法下载');
            }
        },
        viewAllUsers() {
            // 管理员查看所有用户数据
            if (!this.isAdmin) {
                alert('权限不足，只有管理员可以查看所有用户数据');
                return;
            }
            
            // 构建所有用户数据的HTML
            let allUsersData = '<h3>所有用户数据</h3>';
            
            // 遍历所有用户
            Object.keys(this.fileGroups).forEach(username => {
                allUsersData += `<h4>${username} 的数据</h4>`;
                
                // 遍历用户的所有模块
                Object.keys(this.fileGroups[username]).forEach(moduleId => {
                    const moduleName = this.getModuleName(moduleId);
                    allUsersData += `<h5>${moduleName}</h5>`;
                    
                    // 遍历模块的所有文件组
                    this.fileGroups[username][moduleId].forEach((group, index) => {
                        allUsersData += `<p>文件组 ${index + 1} (${group.timestamp})</p>`;
                        allUsersData += `<p>姓名日期：${group.nameDate}</p>`;
                        allUsersData += `<p>报销截止时间：${group.deadlineOption === 'date' ? group.deadlineDate : '无要求'}</p>`;
                        allUsersData += '<hr>';
                    });
                });
            });
            
            // 如果没有数据
            if (allUsersData === '<h3>所有用户数据</h3>') {
                allUsersData += '<p>暂无用户数据</p>';
            }
            
            // 创建弹窗显示所有用户数据
            const popup = window.open('', 'allUsersData', 'width=800,height=600');
            popup.document.write(`
                <html>
                <head>
                    <title>所有用户数据</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h3 { color: #1890ff; }
                        h4 { color: #333; }
                        h5 { color: #666; }
                        p { margin: 5px 0; }
                        hr { margin: 15px 0; border: 1px solid #eee; }
                    </style>
                </head>
                <body>
                    ${allUsersData}
                </body>
                </html>
            `);
            popup.document.close();
        },
        showStorageInfo() {
            this.showStorage = !this.showStorage;
        },
        updateStorageUsage() {
            // 模拟计算存储使用情况
            let used = 0;
            Object.values(this.uploadedFiles).forEach(moduleFiles => {
                Object.values(moduleFiles).forEach(files => {
                    files.forEach(file => {
                        used += file.size;
                    });
                });
            });
            this.usedStorage = Math.round(used / (1024 * 1024));
        }
    },
    watch: {
        deadlineOption(newVal) {
            if (newVal === 'none') {
                this.deadlineDate = '';
            }
        }
    },
    mounted() {
            // 从本地存储加载文件组数据
            const savedFileGroups = localStorage.getItem('fileGroups');
            if (savedFileGroups) {
                this.fileGroups = JSON.parse(savedFileGroups);
            } else {
                // 初始化文件组存储
                this.fileGroups = {};
            }
            
            // 初始化当前用户的文件组存储
            if (!this.fileGroups[this.currentUser]) {
                this.fileGroups[this.currentUser] = {};
            }
        },
        viewMyFiles() {
            // 构建用户文件列表的HTML
            let myFilesData = '<h3>我的文件列表</h3>';
            
            // 遍历用户的所有模块
            if (this.fileGroups[this.currentUser]) {
                Object.keys(this.fileGroups[this.currentUser]).forEach(moduleId => {
                    const moduleName = this.getModuleName(moduleId);
                    myFilesData += `<h4>${moduleName}</h4>`;
                    
                    // 遍历模块的所有文件组
                    this.fileGroups[this.currentUser][moduleId].forEach((group, index) => {
                        myFilesData += `<p>文件组 ${index + 1} (${group.timestamp})</p>`;
                        myFilesData += `<p>姓名日期：${group.nameDate}</p>`;
                        myFilesData += `<p>报销截止时间：${group.deadlineOption === 'date' ? group.deadlineDate : '无要求'}</p>`;
                        myFilesData += '<hr>';
                    });
                });
            }
            
            // 如果没有数据
            if (myFilesData === '<h3>我的文件列表</h3>') {
                myFilesData += '<p>暂无文件数据</p>';
            }
            
            // 创建弹窗显示用户文件列表
            const popup = window.open('', 'myFilesData', 'width=800,height=600');
            popup.document.write(`
                <html>
                <head>
                    <title>我的文件列表</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h3 { color: #1890ff; }
                        h4 { color: #333; }
                        p { margin: 5px 0; }
                        hr { margin: 15px 0; border: 1px solid #eee; }
                    </style>
                </head>
                <body>
                    ${myFilesData}
                </body>
                </html>
            `);
            popup.document.close();
        }
});