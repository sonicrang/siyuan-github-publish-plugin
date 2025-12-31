
import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    openTab,
    adaptHotkey,
    getFrontend,
    getBackend,
    Protyle,
    IOperation,
    Constants,
    fetchPost,
    getAllEditor
} from "siyuan";
import "./index.scss";

import { GitHubSettings } from "./libs/settings";
import { GitHubAPI } from "./libs/github-api";
import { ContentProcessor } from "./libs/content-processor";
import { inputDialogSync } from "./libs/dialog";
import type { GitHubConfig, ImageInfo, PublishRecord, PublishRecords } from "./types/github";

const STORAGE_NAME = "github-publish-config.json";
const PUBLISH_RECORDS_STORAGE = "github-publish-records.json";

/**
 * 辅助函数：规范化路径拼接，处理 basePath 为空或为 / 的情况
 */
function joinPath(basePath: string, ...parts: string[]): string {
    // 移除 basePath 前后的斜杠
    let normalizedBasePath = basePath.replace(/^\/+|\/+$/g, '');
    
    // 过滤掉空的路径部分，并移除前后斜杠
    const normalizedParts = parts
        .filter(part => part !== null && part !== undefined && part !== '')
        .map(part => part.replace(/^\/+|\/+$/g, ''));
    
    // 如果 basePath 为空，直接连接其他部分
    if (!normalizedBasePath) {
        return normalizedParts.join('/');
    }
    
    // 拼接所有部分
    return [normalizedBasePath, ...normalizedParts].filter(p => p).join('/');
}

export default class GitHubPublishPlugin extends Plugin {
    private settings: GitHubSettings;
    private isMobile: boolean;
    private topBarElement: HTMLElement;
    private publishRecords: PublishRecords = {};

    async onload() {

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        // 初始化设置管理
        this.settings = new GitHubSettings(this);
        this.settings.initializeSettings();

        // 加载发布记录
        await this.loadPublishRecords();

        // 添加图标
        this.addIcons(`<symbol id="iconGitHub" viewBox="0 0 16 16">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </symbol>
        <symbol id="iconPublish" viewBox="0 0 24 24">
            <path d="M12 4l-6 6h4v6h4v-6h4l-6-6zm-8 14h16v2H4v-2z"/>
        </symbol>`);

        // 添加上方工具栏按钮
        this.topBarElement = this.addTopBar({
            icon: "iconGitHub",
            title: this.i18n.publishToGitHub,
            position: "right",
            callback: () => {
                this.showPublishMenu();
            }
        });

    }

    onLayoutReady() {
    }

    async onunload() {
        
    }

    /**
     * 插件卸载时调用，删除所有插件保存的数据
     */
    async uninstall() {
        await this.cleanupPluginData();
        showMessage(this.i18n.pluginName + " " + this.i18n.uninstall + ", " + this.i18n.allDataRemoved);
    }

    /**
     * 清理插件保存的所有数据文件
     */
    private async cleanupPluginData() {
        try {
            // 删除发布记录数据
            await this.removeData(PUBLISH_RECORDS_STORAGE);
            
            // 删除配置数据
            await this.removeData(STORAGE_NAME);
        } catch (error) {
            console.error("Failed to cleanup plugin data:", error);
        }
    }

    /**
     * 显示发布菜单
     */
    private showPublishMenu() {
        const menu = new Menu("githubPublishMenu", () => {
        });

        // 获取当前笔记的发布记录
        const publishRecord = this.getCurrentNotePublishRecord();

        // 发布菜单项
        menu.addItem({
            icon: "iconPublish",
            label: this.i18n.publishCurrentNote,
            click: () => {
                this.publishCurrentNote();
            }
        });

        // 如果当前笔记已发布，显示地址信息和删除选项
        // publishRecord 已经通过 getCurrentNotePublishRecord() 验证过属于当前笔记
        if (publishRecord) {
            // 直接显示相关信息，无需再次验证
            menu.addSeparator();
            
            // 上传地址
            menu.addItem({
                icon: "iconGitHub",
                label: `上传地址: ${publishRecord.markdownUrl}`,
                click: () => {
                    // 在浏览器中打开上传地址
                    window.open(publishRecord.markdownUrl, '_blank');
                }
            });

            // 发布地址（如果有自定义域名）
            if (publishRecord.publishUrl) {
                menu.addItem({
                    icon: "iconLanguage",
                    label: `发布地址: ${publishRecord.publishUrl}`,
                    click: () => {
                        // 在浏览器中打开发布地址
                        window.open(publishRecord.publishUrl, '_blank');
                    }
                });
            }

            // 删除发布选项
            menu.addSeparator();
            menu.addItem({
                icon: "iconTrashcan",
                label: "删除发布",
                click: () => {
                    this.deletePublish(publishRecord);
                }
            });
        }

        // 设置菜单项
        menu.addItem({
            icon: "iconSettings",
            label: this.i18n.pluginSettings,
            click: () => {
                this.settings.openSettings();
            }
        });

        // 分隔线
        menu.addSeparator();

        // 帮助菜单项
        menu.addItem({
            icon: "iconHelp",
            label: this.i18n.help,
            click: () => {
                window.open("https://github.com/sonicrang/siyuan-github-publish-plugin", "_blank");
            }
        });

        // 问题反馈菜单项
        menu.addItem({
            icon: "iconFeedback",
            label: this.i18n.feedback,
            click: () => {
                window.open("https://github.com/sonicrang/siyuan-github-publish-plugin/issues/new", "_blank");
            }
        });

        if (this.isMobile) {
            menu.fullscreen();
        } else {
            const rect = this.topBarElement.getBoundingClientRect();
            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        }
    }

    /**
     * 发布当前笔记
     */
    private async publishCurrentNote() {
        try {
            // 获取当前编辑器
            const editor = this.getCurrentEditor();
            if (!editor) {
                showMessage(this.i18n.pleaseOpenNote, 3000, "error");
                return;
            }

            // 获取当前打开的笔记ID
            const noteId = editor.protyle.block.rootID;
            const noteTitle = await this.getNoteTitle(noteId);
            
            // 验证配置
            const config = this.settings.getConfig();
            const validation = this.settings.validateConfig(config);

            if (!validation.isValid) {
                showMessage(`${this.i18n.configIncomplete}: ${validation.errors.join(", ")}`, 5000, "error");
                this.settings.openSettings();
                return;
            }

            // 显示发布对话框（包含上传目录输入和发布按钮）
            const publishResult = await this.showPublishDialog(noteTitle, config);
            if (!publishResult) {
                return; // 用户取消
            }
            const { folderName, frontMatter } = publishResult;

            // 显示进度提示
            showMessage(this.i18n.exportingNote, 3000, "info");

            // 获取 Markdown 内容
            const markdownContent = await this.getNoteMarkdown(noteId);
            
            // 更新进度提示
            showMessage(this.i18n.processingImages, 3000, "info");
            
            // 处理图片
            const processedContent = await ContentProcessor.processMarkdownImages(markdownContent, noteId);
            
            // 更新进度提示（批量上传只需要一个进度提示）
            const updateProgress = () => {
                showMessage(this.i18n.uploadingNote, 3000, "info");
            };
            
            await this.publishToGitHub(config, folderName, processedContent, updateProgress, frontMatter);

            // 保存发布记录
            await this.savePublishRecord(noteId, noteTitle, folderName, config);

            // 等待一段时间确保之前的进度提示消失
            await new Promise(resolve => setTimeout(resolve, 1000));
            showMessage(this.i18n.publishSuccess, 3000);

        } catch (error) {
            console.error("Publish failed:", error);
            showMessage(`${this.i18n.publishFailed}: ${error.message}`, 5000, "error");
        } finally {
            // 确保无论成功还是失败都清除进度提示
            // 思源笔记的 showMessage 会自动清除之前的消息
        }
    }

    /**
     * 删除发布内容
     */
    private async deletePublish(publishRecord: PublishRecord) {
        try {
            // 使用自定义确认对话框
            const userConfirmed = await new Promise<boolean>((resolve) => {
                const dialog = new Dialog({
                    title: this.i18n.deleteConfirmation,
                    content: `
                        <div class="b3-dialog__content">
                            <p>${this.i18n.deleteConfirmMessage.replace("{noteTitle}", publishRecord.noteTitle)}</p>
                            <p class="fn__secondary">${this.i18n.deleteWarning}</p>
                        </div>
                        <div class="b3-dialog__action">
                            <button class="b3-button b3-button--cancel" id="cancelDeleteBtn">${this.i18n.cancel}</button>
                            <div class="fn__space"></div>
                            <button class="b3-button b3-button--text b3-button--error" id="confirmDeleteBtn">${this.i18n.confirmDelete}</button>
                        </div>
                    `,
                    width: "500px"
                });

                const cancelBtn = dialog.element.querySelector("#cancelDeleteBtn");
                const confirmBtn = dialog.element.querySelector("#confirmDeleteBtn");

                cancelBtn.addEventListener("click", () => {
                    dialog.destroy();
                    resolve(false);
                });

                confirmBtn.addEventListener("click", () => {
                    dialog.destroy();
                    resolve(true);
                });
            });

            if (!userConfirmed) {
                return;
            }

            showMessage(this.i18n.deletingPublish, 3000, "info");

            const config = this.settings.getConfig();
            const [owner, repo] = config.repository.split('/');
            const githubAPI = new GitHubAPI(config.accessToken);

            // 删除整个笔记目录（包括Markdown文件和图片）
            const noteDirectoryPath = joinPath(config.basePath, publishRecord.folderName);
            const deleteResult = await githubAPI.deleteDirectory(
                owner,
                repo,
                config.branch,
                noteDirectoryPath,
                `doc: 删除笔记 ${publishRecord.folderName}`
            );

            if (deleteResult.error) {
                console.error("Note directory deletion failed:", deleteResult);
                throw new Error(`删除失败: ${deleteResult.error}`);
            }

            // 从发布记录中移除
            delete this.publishRecords[publishRecord.noteId];
            
            // 保存更新后的发布记录
            await this.savePublishRecordsToStorage();

            showMessage(this.i18n.deleteSuccess, 3000);

        } catch (error) {
            console.error("Delete publish failed:", error);
            showMessage(`${this.i18n.deleteFailed}: ${error.message}`, 5000, "error");
        }
    }

    /**
     * 保存发布记录到存储
     */
    private async savePublishRecordsToStorage() {
        try {
            const storageData = JSON.stringify(this.publishRecords);
            
            // 使用思源笔记插件的 saveData 方法
            await this.saveData(PUBLISH_RECORDS_STORAGE, storageData);
        } catch (error) {
            console.error("Failed to save publish records:", error);
        }
    }

    /**
     * 获取当前编辑器
     */
    private getCurrentEditor() {
        try {
            const editors = getAllEditor();
            if (editors.length === 0) {
                return null;
            }
            
            // 尝试找到当前激活的编辑器
            // 方法1: 查找具有焦点的编辑器
            for (const editor of editors) {
                if (editor.protyle && editor.protyle.element) {
                    const protyleElement = editor.protyle.element;
                    if (protyleElement.contains(document.activeElement)) {
                        return editor;
                    }
                }
            }
            
            // 方法2: 查找可见的编辑器
            for (const editor of editors) {
                if (editor.protyle && editor.protyle.element) {
                    const protyleElement = editor.protyle.element;
                    const style = window.getComputedStyle(protyleElement);
                    if (style.display !== 'none' && style.visibility !== 'hidden') {
                        return editor;
                    }
                }
            }
            
            // 方法3: 返回第一个编辑器作为备用
            return editors[0];
        } catch (error) {
            console.error("Error getting current editor:", error);
            return null;
        }
    }

    /**
     * 获取笔记标题
     */
    private async getNoteTitle(noteId: string): Promise<string> {
        return new Promise((resolve) => {
            // 直接从当前编辑器获取标题
            const editor = this.getCurrentEditor();
            if (editor && editor.protyle && editor.protyle.title) {
                const titleElement = editor.protyle.title.editElement;
                if (titleElement && titleElement.textContent) {
                    resolve(titleElement.textContent);
                    return;
                }
            }
            
            // 如果编辑器中没有标题，使用API获取
            fetchPost("/api/block/getBlockInfo", { id: noteId }, (response: any) => {
                if (response.code === 0 && response.data && response.data.content) {
                    resolve(response.data.content);
                } else {
                    // 如果所有方法都失败，使用默认文件名
                    resolve(`note_${Date.now()}`);
                }
            });
        });
    }


    /**
     * 显示发布对话框（包含上传目录输入和发布按钮）
     */
    private async showPublishDialog(noteTitle: string, config: GitHubConfig): Promise<{ folderName: string; frontMatter?: string } | null> {
        return new Promise((resolve) => {
            const dialog = new Dialog({
                title: this.i18n.publishToGitHub,
                content: `
                    <div class="b3-dialog__content">
                        <div class="b3-label" style="display: flex; align-items: center; gap: 8px;">
                            <span>${this.i18n.uploadFolder}：</span>
                            <input type="text" id="fileNameInput"
                                   value="${noteTitle}"
                                   class="b3-text-field"
                                   placeholder="${this.i18n.enterFileName}" style="flex: 1;">
                        </div>
                        ${config.frontMatter && config.frontMatter.trim() ? `
                        <div class="b3-label" style="margin-top: 8px;">
                            <span>${this.i18n.frontMatter}：</span>
                            <textarea id="frontMatterInput" style="margin-top: 8px; padding: 12px; background: var(--b3-theme-surface-light); border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-height: 200px; overflow-y: auto; width: 100%; min-height: 100px; resize: vertical;"></textarea>
                        </div>
                        ` : ''}
                        <div class="b3-label fn__secondary" style="margin-top: 8px; font-size: 12px; color: var(--b3-theme-on-surface-light);" id="filePathPreview">
                            ${this.i18n.uploadTo}: github.com/${config.repository}/${joinPath(config.basePath, noteTitle)}/index.md
                            ${config.customDomain ? `<br>${this.i18n.publishAs}: ${config.customDomain}/${noteTitle}` : ''}
                        </div>
                    </div>
                    <div class="b3-dialog__action">
                        <button class="b3-button b3-button--cancel" id="cancelBtn">${this.i18n.cancel}</button>
                        <div class="fn__space"></div>
                        <button class="b3-button b3-button--text" id="publishBtn">${this.i18n.publishToGitHub}</button>
                    </div>
                `,
                width: "640px"
            });

            const cancelBtn = dialog.element.querySelector("#cancelBtn");
            const publishBtn = dialog.element.querySelector("#publishBtn");
            const fileNameInput = dialog.element.querySelector("#fileNameInput") as HTMLInputElement;
            const filePathPreview = dialog.element.querySelector("#filePathPreview") as HTMLElement;
            const frontMatterInput = dialog.element.querySelector("#frontMatterInput") as HTMLTextAreaElement;

            // 替换 Front matter 中的占位符
            const replaceFrontMatterPlaceholders = (frontMatter: string, title: string): string => {
                const currentDate = new Date();
                const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
                
                return frontMatter
                    .replace(/<TITLE>/gi, title)
                    .replace(/<DATE>/gi, formattedDate);
            };

            // 更新 Front matter 输入框
            const updateFrontMatterInput = () => {
                if (frontMatterInput && config.frontMatter && config.frontMatter.trim()) {
                    // 使用笔记标题而不是上传目录名来替换 <TITLE> 占位符
                    const processedFrontMatter = replaceFrontMatterPlaceholders(config.frontMatter, noteTitle);
                    frontMatterInput.value = processedFrontMatter;
                }
            };

            // 实时更新文件路径预览和域名预览
            const updateFilePathPreview = () => {
                const fileName = fileNameInput.value.trim() || noteTitle;
                if (config.customDomain) {
                    filePathPreview.innerHTML = `上传至: github.com/${config.repository}/${joinPath(config.basePath, fileName)}/index.md<br>发布为: ${config.customDomain}/${fileName}`;
                } else {
                    filePathPreview.textContent = `上传至: github.com/${config.repository}/${joinPath(config.basePath, fileName)}/index.md`;
                }
                // 同时更新 Front matter 输入框
                updateFrontMatterInput();
            };

            // 监听输入变化
            fileNameInput.addEventListener("input", updateFilePathPreview);
            
            // 初始更新一次
            updateFilePathPreview();

            cancelBtn.addEventListener("click", () => {
                dialog.destroy();
                resolve(null);
            });

            publishBtn.addEventListener("click", () => {
                const fileName = fileNameInput.value.trim();
                if (fileName) {
                    // 获取用户编辑的 Front matter 内容
                    let userFrontMatter = config.frontMatter;
                    if (frontMatterInput && frontMatterInput.value.trim()) {
                        userFrontMatter = frontMatterInput.value.trim();
                    }
                    
                    dialog.destroy();
                    resolve({ folderName: fileName, frontMatter: userFrontMatter });
                } else {
                    showMessage(this.i18n.enterFileName, 3000, "error");
                }
            });
        });
    }

    /**
     * 获取笔记 Markdown 内容
     */
    private async getNoteMarkdown(noteId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fetchPost("/api/export/exportMdContent", { id: noteId }, (response: any) => {
                if (response.code === 0) {
                    resolve(response.data.content);
                } else {
                    console.error("Failed to get markdown content:", response);
                    reject(new Error("获取笔记内容失败"));
                }
            });
        });
    }


    /**
     * 发布到 GitHub（使用批量上传，只创建一个提交）
     */
    private async publishToGitHub(config: GitHubConfig, folderName: string, processedContent: { content: string, images: ImageInfo[] }, progressCallback?: () => void, frontMatter?: string) {
        const [owner, repo] = config.repository.split('/');
        const githubAPI = new GitHubAPI(config.accessToken);

        // 创建文件路径
        const filePath = joinPath(config.basePath, folderName, 'index.md');
        
        // 组合Front Matter和内容
        let finalContent = processedContent.content;
        
        // 如果提供了Front Matter，将其添加到内容前面
        if (frontMatter && frontMatter.trim()) {
            // 移除思源笔记可能自动添加的Front Matter（如果有的话）
            finalContent = this.removeExistingFrontMatter(finalContent);
            
            // 添加自定义 Front Matter（确保不重复添加 --- 分隔符）
            let processedFrontMatter = frontMatter.trim();
            
            // 如果用户提供的 Front Matter 已经包含 --- 分隔符，直接使用
            if (processedFrontMatter.startsWith('---') && processedFrontMatter.endsWith('---')) {
                finalContent = `${processedFrontMatter}\n\n${finalContent}`;
            } else {
                // 否则添加标准的 --- 分隔符
                finalContent = `---\n${processedFrontMatter}\n---\n\n${finalContent}`;
            }
        }

        // 准备要上传的文件列表
        const files: Array<{
            path: string;
            content: string;
            mode?: string;
        }> = [];

        // 添加 Markdown 文件
        files.push({
            path: filePath,
            content: finalContent,
            mode: '100644' // 普通文件
        });

        // 添加图片文件
        for (const image of processedContent.images) {
            if (image.content) {
                const imagePath = joinPath(config.basePath, folderName, image.filename);
                const base64Image = this.arrayBufferToBase64(image.content);
                
                files.push({
                    path: imagePath,
                    content: base64Image,
                    mode: '100644' // 普通文件
                });
            }
        }

        // 使用批量上传方法（只创建一个提交）
        const uploadResult = await githubAPI.uploadFiles(
            owner,
            repo,
            config.branch,
            files,
            `doc: 发布笔记 ${folderName}`
        );

        if (uploadResult.error) {
            console.error("Batch upload failed:", uploadResult);
            throw new Error(`发布失败: ${uploadResult.error}`);
        } else {
            console.log("Batch upload successful:", uploadResult.data);
        }

        // 更新进度（所有文件上传完成）
        if (progressCallback) {
            progressCallback();
        }
    }

    /**
     * 加载发布记录
     */
    private async loadPublishRecords() {
        try {
            // 使用思源笔记插件的 loadData 方法
            const storageData = await this.loadData(PUBLISH_RECORDS_STORAGE);
            
            if (storageData !== null && storageData !== undefined && storageData !== '') {
                try {
                    // 检查存储数据是否是字符串（需要解析）还是已经是对象
                    let parsedData;
                    if (typeof storageData === 'string') {
                        parsedData = JSON.parse(storageData);
                    } else if (typeof storageData === 'object') {
                        parsedData = storageData;
                    } else {
                        console.error("Invalid publish records format:", typeof storageData, storageData);
                        this.publishRecords = {};
                        return;
                    }
                    
                    // 确保解析后的数据是对象格式
                    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
                        this.publishRecords = parsedData;
                    } else {
                        console.error("Invalid publish records format, expected object but got:", typeof parsedData, parsedData);
                        this.publishRecords = {};
                    }
                } catch (parseError) {
                    console.error("Failed to parse publish records:", parseError, "Raw data:", storageData);
                    this.publishRecords = {};
                }
            } else {
                // 如果没有数据，说明存储为空
                this.publishRecords = {};
            }
        } catch (error) {
            console.error("Failed to load publish records:", error);
            this.publishRecords = {};
        }
    }

    /**
     * 保存发布记录
     */
    private async savePublishRecord(noteId: string, noteTitle: string, folderName: string, config: GitHubConfig) {
        const record: PublishRecord = {
            noteId,
            noteTitle,
            folderName,
            publishTime: Date.now(),
            markdownUrl: `https://github.com/${config.repository}/blob/${config.branch}/${joinPath(config.basePath, folderName, 'index.md')}`,
            publishUrl: config.customDomain ? `${config.customDomain}/${folderName}` : undefined,
            config: {
                repository: config.repository,
                basePath: config.basePath,
                customDomain: config.customDomain
            }
        };

        this.publishRecords[noteId] = record;
        
        try {
            const storageData = JSON.stringify(this.publishRecords);
            
            // 使用思源笔记插件的 saveData 方法
            await this.saveData(PUBLISH_RECORDS_STORAGE, storageData);
        } catch (error) {
            console.error("Failed to save publish record:", error);
        }
    }

    /**
     * 获取当前笔记的发布记录
     */
    private getCurrentNotePublishRecord(): PublishRecord | null {
        // 通过当前编辑器获取笔记ID
        const editor = this.getCurrentEditor();
        if (!editor || !editor.protyle || !editor.protyle.block) {
            return null;
        }

        const noteId = editor.protyle.block.rootID;
        
        // 直接通过 noteId 访问发布记录
        const record = this.publishRecords[noteId] || null;
        
        // 双重验证：确保记录确实属于当前笔记
        if (record && record.noteId === noteId) {
            return record;
        }
        return null;
    }

    /**
     * 移除现有的Front Matter（如果存在）
     * 防止思源笔记自动添加的元数据与用户配置的Front Matter冲突
     */
    private removeExistingFrontMatter(content: string): string {
        // 匹配YAML Front Matter格式：以---开头和结尾的内容块
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
        const result = content.replace(frontMatterRegex, '');
        
        // 如果替换后内容以空行开头，移除空行
        return result.replace(/^\s*\n/, '');
    }

    /**
     * 将 ArrayBuffer 转换为 base64 字符串
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }


}
