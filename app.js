/**
 * 智能工作计划手札 - 前端应用
 * 纯本地存储，无需后端
 */

class WorkPlannerApp {
    constructor() {
        this.currentNoteId = null;
        this.currentFolder = 'all';
        this.notes = [];
        this.folders = [];
        this.tags = [];
        this.tasks = [];
        this.settings = {};
        this.pomodoroTimer = null;
        this.pomodoroSeconds = 25 * 60;
        this.pomodoroRunning = false;
        this.pomodoroMode = 'work';

        this.init();
    }

    init() {
        // 初始化
        this.loadData();
        this.bindEvents();
        this.renderFolders();
        this.renderNotes();
        this.updateStats();
        this.setupTheme();
        this.setupMarkdownEditor();
        this.setupPomodoro();
    }

    // ==================== 数据存储 ====================
    loadData() {
        // 从localStorage加载数据
        this.notes = JSON.parse(localStorage.getItem('workplanner_notes') || '[]');
        this.folders = JSON.parse(localStorage.getItem('workplanner_folders') || '[]');
        this.tasks = JSON.parse(localStorage.getItem('workplanner_tasks') || '[]');
        this.settings = JSON.parse(localStorage.getItem('workplanner_settings') || '{}');
        this.tags = JSON.parse(localStorage.getItem('workplanner_tags') || '[]');

        // 初始化默认文件夹
        if (this.folders.length === 0) {
            this.folders = [
                { id: 'work', name: '工作', color: '#3b82f6', count: 0 },
                { id: 'study', name: '学习', color: '#10b981', count: 0 },
                { id: 'ideas', name: '想法', color: '#f59e0b', count: 0 },
                { id: 'goals', name: '目标', color: '#ef4444', count: 0 }
            ];
            this.saveFolders();
        }

        // 初始化默认设置
        if (Object.keys(this.settings).length === 0) {
            this.settings = {
                theme: 'light',
                editor: {
                    fontSize: 16,
                    lineHeight: 1.6,
                    wordWrap: true
                },
                pomodoro: {
                    workDuration: 25,
                    breakDuration: 5
                },
                autoSave: true
            };
            this.saveSettings();
        }

        // 更新文件夹计数
        this.updateFolderCounts();
    }

    saveNotes() {
        localStorage.setItem('workplanner_notes', JSON.stringify(this.notes));
        this.updateStats();
        this.updateFolderCounts();
    }

    saveFolders() {
        localStorage.setItem('workplanner_folders', JSON.stringify(this.folders));
    }

    saveTasks() {
        localStorage.setItem('workplanner_tasks', JSON.stringify(this.tasks));
    }

    saveSettings() {
        localStorage.setItem('workplanner_settings', JSON.stringify(this.settings));
    }

    saveTags() {
        localStorage.setItem('workplanner_tags', JSON.stringify(this.tags));
    }

    // ==================== 笔记管理 ====================
    createNote(title = '新笔记', content = '', tags = [], folder = '') {
        const note = {
            id: Date.now().toString(),
            title,
            content,
            tags,
            folder,
            starred: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            wordCount: content.length
        };

        this.notes.unshift(note);
        this.saveNotes();
        
        // 更新标签
        this.updateTags(tags);
        
        return note;
    }

    updateNote(id, updates) {
        const index = this.notes.findIndex(note => note.id === id);
        if (index !== -1) {
            this.notes[index] = {
                ...this.notes[index],
                ...updates,
                updatedAt: new Date().toISOString(),
                wordCount: updates.content ? updates.content.length : this.notes[index].content.length
            };
            this.saveNotes();
            
            // 更新标签
            if (updates.tags) {
                this.updateTags(updates.tags);
            }
        }
    }

    deleteNote(id) {
        const index = this.notes.findIndex(note => note.id === id);
        if (index !== -1) {
            this.notes.splice(index, 1);
            this.saveNotes();
        }
    }

    getNote(id) {
        return this.notes.find(note => note.id === id);
    }

    getNotesByFolder(folderId) {
        if (folderId === 'all') {
            return this.notes;
        } else if (folderId === 'starred') {
            return this.notes.filter(note => note.starred);
        } else if (folderId === 'today') {
            const today = new Date().toDateString();
            return this.notes.filter(note => 
                new Date(note.updatedAt).toDateString() === today
            );
        } else {
            return this.notes.filter(note => note.folder === folderId);
        }
    }

    searchNotes(query) {
        if (!query) return this.notes;
        
        const lowerQuery = query.toLowerCase();
        return this.notes.filter(note => 
            note.title.toLowerCase().includes(lowerQuery) ||
            note.content.toLowerCase().includes(lowerQuery) ||
            note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    // ==================== 标签管理 ====================
    updateTags(newTags) {
        newTags.forEach(tag => {
            if (!this.tags.some(t => t.name === tag)) {
                this.tags.push({
                    name: tag,
                    count: 1
                });
            } else {
                const tagIndex = this.tags.findIndex(t => t.name === tag);
                this.tags[tagIndex].count++;
            }
        });
        this.saveTags();
    }

    getPopularTags(limit = 10) {
        return this.tags
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    // ==================== 文件夹管理 ====================
    updateFolderCounts() {
        this.folders.forEach(folder => {
            folder.count = this.notes.filter(note => note.folder === folder.id).length;
        });
        this.saveFolders();
    }

    createFolder(name, color) {
        const folder = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            color,
            count: 0
        };
        
        this.folders.push(folder);
        this.saveFolders();
        return folder;
    }

    // ==================== 任务管理 ====================
    createTask(title, description = '', column = 'todo') {
        const task = {
            id: Date.now().toString(),
            title,
            description,
            column,
            createdAt: new Date().toISOString(),
            dueDate: null,
            priority: 'medium',
            tags: []
        };
        
        this.tasks.push(task);
        this.saveTasks();
        return task;
    }

    updateTask(id, updates) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...updates };
            this.saveTasks();
        }
    }

    deleteTask(id) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index !== -1) {
            this.tasks.splice(index, 1);
            this.saveTasks();
        }
    }

    getTasksByColumn(column) {
        return this.tasks.filter(task => task.column === column);
    }

    // ==================== 番茄时钟 ====================
    setupPomodoro() {
        this.pomodoroSeconds = this.settings.pomodoro?.workDuration * 60 || 25 * 60;
        this.updatePomodoroDisplay();
    }

    startPomodoro() {
        if (this.pomodoroRunning) return;
        
        this.pomodoroRunning = true;
        this.pomodoroMode = 'work';
        this.pomodoroTimer = setInterval(() => {
            this.pomodoroSeconds--;
            this.updatePomodoroDisplay();
            
            if (this.pomodoroSeconds <= 0) {
                this.pomodoroFinished();
            }
        }, 1000);
    }

    pausePomodoro() {
        if (!this.pomodoroRunning) return;
        
        this.pomodoroRunning = false;
        clearInterval(this.pomodoroTimer);
    }

    resetPomodoro() {
        this.pausePomodoro();
        this.pomodoroMode = 'work';
        this.pomodoroSeconds = this.settings.pomodoro?.workDuration * 60 || 25 * 60;
        this.updatePomodoroDisplay();
    }

    pomodoroFinished() {
        this.pausePomodoro();
        
        if (this.pomodoroMode === 'work') {
            this.pomodoroMode = 'break';
            this.pomodoroSeconds = this.settings.pomodoro?.breakDuration * 60 || 5 * 60;
            this.showNotification('工作时间结束！该休息了。', 'success');
        } else {
            this.pomodoroMode = 'work';
            this.pomodoroSeconds = this.settings.pomodoro?.workDuration * 60 || 25 * 60;
            this.showNotification('休息时间结束！开始工作吧。', 'info');
        }
        
        this.startPomodoro();
    }

    updatePomodoroDisplay() {
        const minutes = Math.floor(this.pomodoroSeconds / 60);
        const seconds = this.pomodoroSeconds % 60;
        const timeElement = document.getElementById('pomodoroTime');
        const modeElement = document.querySelector('.pomodoro-mode');
        
        if (timeElement) {
            timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (modeElement) {
            modeElement.textContent = this.pomodoroMode === 'work' ? '工作模式' : '休息模式';
        }
    }

    // ==================== 主题管理 ====================
    setupTheme() {
        const theme = this.settings.theme || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        this.settings.theme = newTheme;
        this.saveSettings();
        
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // ==================== Markdown编辑器 ====================
    setupMarkdownEditor() {
        const editorElement = document.getElementById('markdownEditor');
        const previewElement = document.getElementById('markdownPreview');
        
        if (editorElement && previewElement) {
            editorElement.addEventListener('input', (e) => {
                this.updateMarkdownPreview(e.target.value);
            });
        }
    }

    updateMarkdownPreview(markdown) {
        const previewElement = document.getElementById('markdownPreview');
        if (!previewElement) return;
        
        // 简单的Markdown转换
        let html = marked.parse(markdown);
        
        // 清理HTML（防止XSS攻击）
        html = DOMPurify.sanitize(html);
        
        previewElement.innerHTML = html;
        
        // 更新字数统计
        this.updateWordCount(markdown);
    }

    // ==================== 渲染方法 ====================
    renderFolders() {
        const foldersList = document.getElementById('foldersList');
        if (!foldersList) return;
        
        // 清空现有文件夹（除了内置的）
        const builtInFolders = ['all', 'starred', 'today'];
        const itemsToRemove = Array.from(foldersList.children).filter(
            item => !builtInFolders.includes(item.dataset.id)
        );
        itemsToRemove.forEach(item => item.remove());
        
        // 渲染自定义文件夹
        this.folders.forEach(folder => {
            const li = document.createElement('li');
            li.className = 'folder-item';
            li.dataset.id = folder.id;
            li.innerHTML = `
                <i class="fas fa-folder" style="color: ${folder.color}"></i>
                <span>${folder.name}</span>
                <span class="folder-count">${folder.count}</span>
            `;
            
            li.addEventListener('click', () => this.selectFolder(folder.id));
            foldersList.appendChild(li);
        });
        
        // 更新文件夹计数
        this.updateFolderCountElements();
    }

    renderNotes() {
        const notesList = document.getElementById('notesList');
        if (!notesList) return;
        
        const notes = this.getNotesByFolder(this.currentFolder);
        
        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <h3>还没有笔记</h3>
                    <p>点击"新建笔记"开始记录</p>
                </div>
            `;
            return;
        }
        
        notesList.innerHTML = '';
        
        notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            if (note.id === this.currentNoteId) {
                noteCard.classList.add('selected');
            }
            
            // 创建预览文本
            const preview = note.content
                .replace(/[#*\[\]()>`]/g, '')
                .substring(0, 150)
                .trim() + (note.content.length > 150 ? '...' : '');
            
            // 格式化时间
            const updatedTime = moment(note.updatedAt).fromNow();
            
            noteCard.innerHTML = `
                <div class="note-card-header">
                    <div class="note-card-title">${note.title || '无标题笔记'}</div>
                    <div class="note-card-star ${note.starred ? 'starred' : ''}">
                        <i class="fas fa-star"></i>
                    </div>
                </div>
                <div class="note-card-preview">${preview}</div>
                <div class="note-card-footer">
                    <div class="note-card-tags">
                        ${note.tags.slice(0, 3).map(tag => 
                            `<span class="note-card-tag">${tag}</span>`
                        ).join('')}
                    </div>
                    <div class="note-card-time">${updatedTime}</div>
                </div>
            `;
            
            noteCard.addEventListener('click', () => this.selectNote(note.id));
            
            const starBtn = noteCard.querySelector('.note-card-star');
            starBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleStar(note.id);
            });
            
            notesList.appendChild(noteCard);
        });
    }

    renderTags() {
        const tagsCloud = document.getElementById('tagsCloud');
        if (!tagsCloud) return;
        
        const popularTags = this.getPopularTags(15);
        
        tagsCloud.innerHTML = popularTags.map(tag => `
            <span class="tag" data-tag="${tag.name}">
                ${tag.name} <small>(${tag.count})</small>
            </span>
        `).join('');
        
        // 绑定标签点击事件
        tagsCloud.querySelectorAll('.tag').forEach(tag => {
            tag.addEventListener('click', () => {
                this.filterByTag(tag.dataset.tag);
            });
        });
    }

    renderKanban() {
        const columns = {
            todo: document.getElementById('todoColumn'),
            doing: document.getElementById('doingColumn'),
            review: document.getElementById('reviewColumn'),
            done: document.getElementById('doneColumn')
        };
        
        // 清空所有列
        Object.values(columns).forEach(column => {
            if (column) column.innerHTML = '';
        });
        
        // 渲染任务
        this.tasks.forEach(task => {
            const column = columns[task.column];
            if (!column) return;
            
            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';
            taskCard.dataset.id = task.id;
            taskCard.draggable = true;
            
            taskCard.innerHTML = `
                <div class="task-title">${task.title}</div>
                ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}
                ${task.dueDate ? `
                    <div class="task-due">
                        <i class="far fa-calendar"></i>
                        ${moment(task.dueDate).format('MM/DD')}
                    </div>
                ` : ''}
            `;
            
            // 添加拖拽事件
            taskCard.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', task.id);
            });
            
            column.appendChild(taskCard);
        });
        
        // 更新列计数
        Object.keys(columns).forEach(columnId => {
            const count = this.getTasksByColumn(columnId).length;
            const countElement = document.querySelector(`#${columnId}Column .column-count`);
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    // ==================== UI更新方法 ====================
    updateStats() {
        // 总笔记数
        const totalNotes = this.notes.length;
        const totalNotesElement = document.getElementById('totalNotes');
        if (totalNotesElement) {
            totalNotesElement.textContent = totalNotes;
        }
        
        // 星标笔记数
        const starredCount = this.notes.filter(note => note.starred).length;
        const starredCountElement = document.getElementById('starredCount');
        if (starredCountElement) {
            starredCountElement.textContent = starredCount;
        }
        
        // 今日笔记数
        const today = new Date().toDateString();
        const todayCount = this.notes.filter(note => 
            new Date(note.updatedAt).toDateString() === today
        ).length;
        const todayCountElement = document.getElementById('todayCount');
        if (todayCountElement) {
            todayCountElement.textContent = todayCount;
        }
        
        // 总字数
        const totalWords = this.notes.reduce((sum, note) => sum + (note.wordCount || 0), 0);
        const totalWordsElement = document.getElementById('totalWords');
        if (totalWordsElement) {
            totalWordsElement.textContent = totalWords;
        }
        
        // 完成的任务数
        const completedTasks = this.tasks.filter(task => task.column === 'done').length;
        const completedTasksElement = document.getElementById('completedTasks');
        if (completedTasksElement) {
            completedTasksElement.textContent = completedTasks;
        }
        
        // 更新全部笔记计数
        const allNotesCountElement = document.getElementById('allNotesCount');
        if (allNotesCountElement) {
            allNotesCountElement.textContent = totalNotes;
        }
    }

    updateFolderCountElements() {
        this.folders.forEach(folder => {
            const folderElement = document.querySelector(`.folder-item[data-id="${folder.id}"] .folder-count`);
            if (folderElement) {
                folderElement.textContent = folder.count;
            }
        });
    }

    updateWordCount(text) {
        const wordCountElement = document.getElementById('wordCount');
        if (wordCountElement) {
            const words = text.trim().split(/\s+/).length;
            const chars = text.length;
            wordCountElement.textContent = `${words} 字 (${chars} 字符)`;
        }
    }

    updateNoteInfo(note) {
        if (!note) return;
        
        const createdElement = document.getElementById('noteCreated');
        const updatedElement = document.getElementById('noteUpdated');
        
        if (createdElement) {
            createdElement.textContent = `创建于 ${moment(note.createdAt).format('YYYY-MM-DD HH:mm')}`;
        }
        
        if (updatedElement) {
            updatedElement.textContent = `更新于 ${moment(note.updatedAt).fromNow()}`;
        }
        
        if (note.content) {
            this.updateWordCount(note.content);
        }
    }

    // ==================== 事件处理器 ====================
    bindEvents() {
        // 新建笔记
        document.getElementById('newNoteBtn')?.addEventListener('click', () => {
            this.newNote();
        });
        
        // 今日日记
        document.getElementById('todayNoteBtn')?.addEventListener('click', () => {
            this.newDailyNote();
        });
        
        // 搜索
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        // 主题切换
        document.querySelector('.theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // 文件夹点击
        document.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectFolder(item.dataset.id);
            });
        });
        
        // 保存笔记
        document.getElementById('saveNoteBtn')?.addEventListener('click', () => {
            this.saveCurrentNote();
        });
        
        // 星标笔记
        document.getElementById('starNoteBtn')?.addEventListener('click', () => {
            this.toggleStarCurrentNote();
        });
        
        // 删除笔记
        document.getElementById('deleteNoteBtn')?.addEventListener('click', () => {
            this.deleteCurrentNote();
        });
        
        // 导出笔记
        document.getElementById('exportNoteBtn')?.addEventListener('click', () => {
            this.exportCurrentNote();
        });
        
        // 添加文件夹
        document.getElementById('addFolderBtn')?.addEventListener('click', () => {
            this.showFolderModal();
        });
        
        // 看板视图
        document.getElementById('kanbanBtn')?.addEventListener('click', () => {
            this.showKanbanModal();
        });
        
        // 日历视图
        document.getElementById('calendarBtn')?.addEventListener('click', () => {
            this.showCalendar();
        });
        
        // 导出数据
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.showExportModal();
        });
        
        // 导入数据
        document.getElementById('importBtn')?.addEventListener('click', () => {
            this.importData();
        });
        
        // 标签输入
        document.getElementById('tagsInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                this.addTagToCurrentNote(e.target.value.trim());
                e.target.value = '';
            }
        });
        
        // 编辑器工具栏
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                if (command) {
                    this.executeEditorCommand(command);
                }
            });
        });
        
        // 预览切换
        document.getElementById('previewToggle')?.addEventListener('click', () => {
            this.togglePreview();
        });
        
        // 模态框关闭
        document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });
        
        // 番茄时钟控制
        document.getElementById('startPomodoroBtn')?.addEventListener('click', () => {
            this.startPomodoro();
        });
        
        document.getElementById('pausePomodoroBtn')?.addEventListener('click', () => {
            this.pausePomodoro();
        });
        
        document.getElementById('resetPomodoroBtn')?.addEventListener('click', () => {
            this.resetPomodoro();
        });
        
        document.getElementById('closePomodoroBtn')?.addEventListener('click', () => {
            document.getElementById('pomodoroWidget').style.display = 'none';
        });
        
        // 自动保存（防抖处理）
        const editorElement = document.getElementById('markdownEditor');
        if (editorElement) {
            let saveTimeout;
            editorElement.addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    if (this.currentNoteId && this.settings.autoSave) {
                        this.saveCurrentNote();
                    }
                }, 1000);
            });
        }
        
        // 窗口关闭前保存
        window.addEventListener('beforeunload', () => {
            if (this.currentNoteId) {
                this.saveCurrentNote();
            }
        });
    }

    // ==================== 用户操作 ====================
    newNote() {
        const note = this.createNote();
        this.selectNote(note.id);
        this.showNotification('已创建新笔记', 'success');
    }

    newDailyNote() {
        const today = moment().format('YYYY-MM-DD');
        const title = `日记 - ${today}`;
        const content = `# ${today} 日记

## 📝 今日总结

### 🎯 今日成就
1. 

### 💡 学到的经验
1. 

### 📅 明日计划
1. 

## 🌟 感恩三件事
1. 
2. 
3. 

## 📊 习惯追踪
- [ ] 早起
- [ ] 运动
- [ ] 阅读
- [ ] 冥想

## 💭 今日思考

`;
        
        const note = this.createNote(title, content, ['日记', '日常'], 'today');
        this.selectNote(note.id);
        this.showNotification('已创建今日日记', 'success');
    }

    selectNote(id) {
        const note = this.getNote(id);
        if (!note) return;
        
        this.currentNoteId = id;
        
        // 更新编辑器
        const titleInput = document.getElementById('noteTitle');
        const editorInput = document.getElementById('markdownEditor');
        
        if (titleInput) titleInput.value = note.title;
        if (editorInput) editorInput.value = note.content;
        
        // 更新标签显示
        this.renderTagsForNote(note.tags);
        
        // 更新笔记信息
        this.updateNoteInfo(note);
        
        // 更新星标按钮
        const starBtn = document.getElementById('starNoteBtn');
        if (starBtn) {
            starBtn.innerHTML = note.starred ? 
                '<i class="fas fa-star"></i>' : 
                '<i class="far fa-star"></i>';
        }
        
        // 更新Markdown预览
        this.updateMarkdownPreview(note.content);
        
        // 重新渲染笔记列表（更新选中状态）
        this.renderNotes();
        
        // 聚焦到编辑器
        if (editorInput) {
            setTimeout(() => editorInput.focus(), 100);
        }
    }

    selectFolder(folderId) {
        this.currentFolder = folderId;
        
        // 更新UI状态
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === folderId);
        });
        
        // 更新列表标题
        const listTitle = document.getElementById('listTitle');
        if (listTitle) {
            const folderNames = {
                all: '全部笔记',
                starred: '星标笔记',
                today: '今日笔记'
            };
            listTitle.textContent = folderNames[folderId] || folderId;
        }
        
        // 重新渲染笔记列表
        this.renderNotes();
    }

    saveCurrentNote() {
        if (!this.currentNoteId) return;
        
        const titleInput = document.getElementById('noteTitle');
        const editorInput = document.getElementById('markdownEditor');
        const tagsInput = document.getElementById('tagsInput');
        
        if (!titleInput || !editorInput) return;
        
        const title = titleInput.value.trim();
        const content = editorInput.value;
        const tags = this.getCurrentNoteTags();
        
        if (!title) {
            this.showNotification('请输入笔记标题', 'error');
            titleInput.focus();
            return;
        }
        
        this.updateNote(this.currentNoteId, { title, content, tags });
        this.showNotification('笔记已保存', 'success');
        this.renderNotes();
    }

    toggleStar(id) {
        const note = this.getNote(id);
        if (note) {
            this.updateNote(id, { starred: !note.starred });
            this.renderNotes();
            this.updateStats();
        }
    }

    toggleStarCurrentNote() {
        if (!this.currentNoteId) return;
        this.toggleStar(this.currentNoteId);
    }

    deleteCurrentNote() {
        if (!this.currentNoteId) return;
        
        if (confirm('确定要删除这个笔记吗？')) {
            this.deleteNote(this.currentNoteId);
            this.currentNoteId = null;
            
            // 清空编辑器
            const titleInput = document.getElementById('noteTitle');
            const editorInput = document.getElementById('markdownEditor');
            
            if (titleInput) titleInput.value = '';
            if (editorInput) editorInput.value = '';
            
            this.showNotification('笔记已删除', 'success');
            this.renderNotes();
        }
    }

    exportCurrentNote() {
        if (!this.currentNoteId) return;
        
        const note = this.getNote(this.currentNoteId);
        if (!note) return;
        
        const content = `# ${note.title}\n\n${note.content}`;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('笔记已导出', 'success');
    }

    // ==================== 标签管理 ====================
    renderTagsForNote(tags) {
        const tagsDisplay = document.getElementById('tagsDisplay');
        if (!tagsDisplay) return;
        
        tagsDisplay.innerHTML = tags.map(tag => `
            <span class="tag-badge">
                ${tag}
                <span class="tag-remove" data-tag="${tag}">&times;</span>
            </span>
        `).join('');
        
        // 绑定删除标签事件
        tagsDisplay.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTagFromCurrentNote(btn.dataset.tag);
            });
        });
    }

    getCurrentNoteTags() {
        const tagsDisplay = document.getElementById('tagsDisplay');
        if (!tagsDisplay) return [];
        
        return Array.from(tagsDisplay.querySelectorAll('.tag-badge')).map(badge => 
            badge.textContent.replace('×', '').trim()
        );
    }

    addTagToCurrentNote(tag) {
        if (!this.currentNoteId) return;
        
        const note = this.getNote(this.currentNoteId);
        if (!note) return;
        
        if (!note.tags.includes(tag)) {
            const newTags = [...note.tags, tag];
            this.updateNote(this.currentNoteId, { tags: newTags });
            this.renderTagsForNote(newTags);
            this.renderTags();
        }
    }

    removeTagFromCurrentNote(tag) {
        if (!this.currentNoteId) return;
        
        const note = this.getNote(this.currentNoteId);
        if (!note) return;
        
        const newTags = note.tags.filter(t => t !== tag);
        this.updateNote(this.currentNoteId, { tags: newTags });
        this.renderTagsForNote(newTags);
        this.renderTags();
    }

    filterByTag(tag) {
        // 这里可以实现按标签筛选笔记的功能
        this.showNotification(`筛选标签: ${tag}`, 'info');
    }

    // ==================== 编辑器命令 ====================
    executeEditorCommand(command) {
        const editor = document.getElementById('markdownEditor');
        if (!editor) return;
        
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        let newText = '';
        
        switch (command) {
            case 'bold':
                newText = `**${selectedText || '粗体文字'}**`;
                break;
            case 'italic':
                newText = `*${selectedText || '斜体文字'}*`;
                break;
            case 'header':
                newText = `# ${selectedText || '标题'}`;
                break;
            case 'link':
                newText = `[${selectedText || '链接文字'}](url)`;
                break;
            case 'image':
                newText = `![${selectedText || '图片描述'}](图片地址)`;
                break;
            case 'code':
                newText = `\`${selectedText || '代码'}\``;
                break;
            case 'list':
                newText = `- ${selectedText || '列表项'}`;
                break;
            case 'task':
                newText = `- [ ] ${selectedText || '任务项'}`;
                break;
        }
        
        editor.value = editor.value.substring(0, start) + newText + editor.value.substring(end);
        editor.focus();
        editor.selectionStart = editor.selectionEnd = start + newText.length;
        
        // 触发输入事件以更新预览
        editor.dispatchEvent(new Event('input'));
    }

    togglePreview() {
        const previewPane = document.getElementById('previewPane');
        if (previewPane) {
            previewPane.style.display = previewPane.style.display === 'none' ? 'flex' : 'none';
        }
    }

    // ==================== 搜索功能 ====================
    handleSearch(query) {
        if (!query) {
            this.renderNotes();
            return;
        }
        
        const results = this.searchNotes(query);
        const notesList = document.getElementById('notesList');
        
        if (!notesList) return;
        
        if (results.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>没有找到相关笔记</h3>
                    <p>尝试其他关键词</p>
                </div>
            `;
            return;
        }
        
        notesList.innerHTML = results.map(note => {
            const preview = note.content
                .replace(/[#*\[\]()>`]/g, '')
                .substring(0, 100)
                .trim() + (note.content.length > 100 ? '...' : '');
            
            const updatedTime = moment(note.updatedAt).fromNow();
            
            return `
                <div class="note-card" onclick="app.selectNote('${note.id}')">
                    <div class="note-card-header">
                        <div class="note-card-title">${note.title || '无标题笔记'}</div>
                        <div class="note-card-star ${note.starred ? 'starred' : ''}">
                            <i class="fas fa-star"></i>
                        </div>
                    </div>
                    <div class="note-card-preview">${preview}</div>
                    <div class="note-card-footer">
                        <div class="note-card-tags">
                            ${note.tags.slice(0, 3).map(tag => 
                                `<span class="note-card-tag">${tag}</span>`
                            ).join('')}
                        </div>
                        <div class="note-card-time">${updatedTime}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ==================== 模态框管理 ====================
    showFolderModal() {
        const modal = document.getElementById('folderModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal && overlay) {
            overlay.classList.add('active');
            modal.style.display = 'block';
            
            // 重置表单
            document.getElementById('folderNameInput').value = '';
            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.remove('selected');
            });
            document.querySelector('.color-option').classList.add('selected');
            
            // 绑定确认事件
            const confirmBtn = document.getElementById('confirmFolderBtn');
            const cancelBtn = document.getElementById('cancelFolderBtn');
            
            const confirmHandler = () => {
                const nameInput = document.getElementById('folderNameInput');
                const colorOption = document.querySelector('.color-option.selected');
                
                if (nameInput.value.trim()) {
                    const color = colorOption?.dataset.color || '#3b82f6';
                    this.createFolder(nameInput.value.trim(), color);
                    this.closeModal();
                    this.showNotification('文件夹已创建', 'success');
                }
            };
            
            confirmBtn.onclick = confirmHandler;
            cancelBtn.onclick = () => this.closeModal();
            
            // 颜色选择
            document.querySelectorAll('.color-option').forEach(option => {
                option.onclick = () => {
                    document.querySelectorAll('.color-option').forEach(o => 
                        o.classList.remove('selected')
                    );
                    option.classList.add('selected');
                };
            });
        }
    }

    showKanbanModal() {
        const modal = document.getElementById('kanbanModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal && overlay) {
            overlay.classList.add('active');
            modal.style.display = 'block';
            
            this.renderKanban();
            
            // 设置看板列的可拖放
            const columns = document.querySelectorAll('.kanban-column');
            columns.forEach(column => {
                column.addEventListener('dragover', (e) => {
                    e.preventDefault();
                });
                
                column.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData('text/plain');
                    const columnId = column.id.replace('Column', '');
                    this.updateTask(taskId, { column: columnId });
                    this.renderKanban();
                });
            });
            
            // 添加任务按钮
            document.querySelectorAll('.add-task-btn').forEach(btn => {
                btn.onclick = () => {
                    const columnId = btn.parentElement.id.replace('Column', '');
                    const title = prompt('请输入任务标题:');
                    if (title) {
                        this.createTask(title, '', columnId);
                        this.renderKanban();
                    }
                };
            });
        }
    }

    showExportModal() {
        const modal = document.getElementById('exportModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal && overlay) {
            overlay.classList.add('active');
            modal.style.display = 'block';
            
            const confirmBtn = document.getElementById('confirmExportBtn');
            const cancelBtn = document.getElementById('cancelExportBtn');
            
            confirmBtn.onclick = () => {
                const exportType = document.querySelector('input[name="exportType"]:checked').value;
                this.exportData(exportType);
                this.closeModal();
            };
            
            cancelBtn.onclick = () => this.closeModal();
        }
    }

    showCalendar() {
        this.showNotification('日历视图功能开发中', 'info');
    }

    closeModal() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // ==================== 数据导入导出 ====================
    exportData(type = 'all') {
        let data = {};
        
        if (type === 'all') {
            data = {
                notes: this.notes,
                folders: this.folders,
                tasks: this.tasks,
                settings: this.settings,
                tags: this.tags,
                exportDate: new Date().toISOString()
            };
        } else if (type === 'notes') {
            data = {
                notes: this.notes,
                exportDate: new Date().toISOString()
            };
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `workplanner_export_${moment().format('YYYYMMDD_HHmmss')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('数据导出成功', 'success');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.notes) {
                        this.notes = data.notes;
                        this.saveNotes();
                    }
                    
                    if (data.folders) {
                        this.folders = data.folders;
                        this.saveFolders();
                    }
                    
                    if (data.tasks) {
                        this.tasks = data.tasks;
                        this.saveTasks();
                    }
                    
                    if (data.settings) {
                        this.settings = data.settings;
                        this.saveSettings();
                    }
                    
                    if (data.tags) {
                        this.tags = data.tags;
                        this.saveTags();
                    }
                    
                    this.renderFolders();
                    this.renderNotes();
                    this.renderTags();
                    this.updateStats();
                    
                    this.showNotification('数据导入成功', 'success');
                } catch (error) {
                    this.showNotification('导入失败：文件格式错误', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    // ==================== 通知系统 ====================
    showNotification(message, type = 'info') {
        const notificationArea = document.getElementById('notificationArea');
        if (!notificationArea) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle'
        };
        
        notification.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <div class="notification-close">&times;</div>
        `;
        
        notificationArea.appendChild(notification);
        
        // 关闭按钮
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        });
        
        // 自动关闭
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// ==================== 应用初始化 ====================
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new WorkPlannerApp();
    window.app = app; // 暴露到全局，便于调试
});

// 暴露一些全局函数供HTML使用
window.togglePreview = () => app.togglePreview();
window.executeEditorCommand = (command) => app.executeEditorCommand(command);