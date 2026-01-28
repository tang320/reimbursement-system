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
            
            // 上传文件到后端服务器
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
            
            try {
                // 真实上传请求（Vercel部署时使用）
                const response = await fetch('https://reimbursement-system.vercel.app/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                
                // 模拟成功响应（本地开发时使用）
                // const result = { success: true, files: [] };
                
                if (result.success) {
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
                    
                    // 模拟保存到本地存储
                    localStorage.setItem('fileGroups', JSON.stringify(this.fileGroups));
                    
                    alert('文件组保存成功！');
                    
                    // 重置当前模块的文件
                    this.uploadedFiles[this.selectedModule] = {};
                    this.fileTypes[this.selectedModule].forEach(type => {
                        this.uploadedFiles[this.selectedModule][type.id] = [];
                    });
                    this.nameDate = '';
                    this.deadlineOption = 'none';
                    this.deadlineDate = '';
                } else {
                    alert('文件上传失败：' + result.message);
                }
            } catch (error) {
                console.error('上传失败：', error);
                alert('文件上传失败，请稍后重试');
            }
        },
        downloadFileGroup() {
            if (!this.selectedModule) return;
            
            // 模拟下载功能
            const moduleName = this.getModuleName(this.selectedModule);
            const fileName = `${moduleName}${this.nameDate ? '_' + this.nameDate : ''}.zip`;
            
            // 计算文件大小
            let totalSize = 0;
            if (this.uploadedFiles[this.selectedModule]) {
                Object.values(this.uploadedFiles[this.selectedModule]).forEach(files => {
                    files.forEach(file => {
                        totalSize += file.size;
                    });
                });
            }
            
            alert(`文件组已准备就绪，即将下载：${fileName}\n文件大小：${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
            
            // 实际项目中，这里应该实现真实的文件打包和下载功能
            // 例如：window.location.href = `https://reimbursement-system.vercel.app/api/download-group/${this.currentUser}/${this.selectedModule}?nameDate=${this.nameDate}`;
        },
        downloadFile(moduleId, fileTypeId, index) {
            // 模拟单文件下载功能
            const file = this.uploadedFiles[moduleId]?.[fileTypeId]?.[index];
            if (file) {
                alert(`文件已准备就绪，即将下载：${file.name}\n文件大小：${(file.size / (1024 * 1024)).toFixed(2)} MB`);
                
                // 实际项目中，这里应该实现真实的文件下载功能
                // 例如：window.location.href = `https://reimbursement-system.vercel.app/api/download/${this.currentUser}/${moduleId}/${file.name}`;
            }
        },
        viewAllUsers() {
            // 模拟查看所有用户数据
            alert('查看所有用户数据功能已触发');
            // 实际项目中，这里应该显示所有用户的文件数据
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
        }
    }
});