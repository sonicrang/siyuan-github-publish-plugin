
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

const STORAGE_NAME = "github-publish-config";
const PUBLISH_RECORDS_STORAGE = "github-publish-records";

export default class GitHubPublishPlugin extends Plugin {
    private settings: GitHubSettings;
    private isMobile: boolean;
    private topBarElement: HTMLElement;
    private publishRecords: PublishRecords = {};

    async onload() {
        console.log("loading siyuan-github-publish-plugin");

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
            title: "发布到 GitHub",
            position: "right",
            callback: () => {
                this.showPublishMenu();
            }
        });

        console.log("GitHub Publish Plugin loaded successfully");
    }

    onLayoutReady() {
        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);
    }

    async onunload() {
        console.log("unloading GitHub Publish Plugin");
        showMessage("GitHub 发布插件已卸载");
    }

    /**
     * 显示发布菜单
     */
    private showPublishMenu() {
        const menu = new Menu("githubPublishMenu", () => {
            console.log("Publish menu closed");
        });

        // 获取当前笔记的发布记录
        const publishRecord = this.getCurrentNotePublishRecord();

        // 发布菜单项
        menu.addItem({
            icon: "iconPublish",
            label: "发布当前笔记",
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
            label: "插件设置",
            click: () => {
                this.settings.openSettings();
            }
        });

        // 分隔线
        menu.addSeparator();

        // 帮助菜单项
        menu.addItem({
            icon: "iconHelp",
            label: "使用帮助",
            click: () => {
                window.open("https://github.com/sonicrang/siyuan-github-publish-plugin", "_blank");
            }
        });

        // 问题反馈菜单项
        menu.addItem({
            icon: "iconFeedback",
            label: "问题反馈",
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
                showMessage("请先打开一篇笔记", 3000, "error");
                return;
            }

            // 获取当前打开的笔记ID
            const noteId = editor.protyle.block.rootID;
            const noteTitle = await this.getNoteTitle(noteId);
            
            // 验证配置
            const config = this.settings.getConfig();
            const validation = this.settings.validateConfig(config);

            if (!validation.isValid) {
                showMessage(`配置不完整: ${validation.errors.join(", ")}`, 5000, "error");
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
            showMessage("正在导出笔记内容...", 3000, "info");

            // 获取 Markdown 内容
            const markdownContent = await this.getNoteMarkdown(noteId);
            
            // 更新进度提示
            showMessage("正在处理图片...", 3000, "info");
            
            // 处理图片
            const processedContent = await ContentProcessor.processMarkdownImages(markdownContent, noteId);
            
            // 发布到 GitHub
            console.log("Starting GitHub publish process...");
            
            // 计算总文件数 (Markdown文件 + 图片文件)
            const totalFiles = 1 + processedContent.images.length;
            let uploadedFiles = 0;
            
            // 更新进度提示
            const updateProgress = () => {
                uploadedFiles++;
                showMessage(`正在上传到 GitHub... (${uploadedFiles}/${totalFiles})`, 3000, "info");
            };
            
            await this.publishToGitHub(config, folderName, processedContent, updateProgress, frontMatter);
            console.log("GitHub publish process completed successfully");

            // 保存发布记录
            await this.savePublishRecord(noteId, noteTitle, folderName, config);

            // 等待一段时间确保之前的进度提示消失
            await new Promise(resolve => setTimeout(resolve, 1000));
            showMessage("发布成功！", 3000);
            console.log("Success message displayed");

        } catch (error) {
            console.error("Publish failed:", error);
            showMessage(`发布失败: ${error.message}`, 5000, "error");
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
                    title: "确认删除",
                    content: `
                        <div class="b3-dialog__content">
                            <p>确定要从 GitHub 删除笔记 "${publishRecord.noteTitle}" 的发布内容吗？</p>
                            <p class="fn__secondary">此操作将删除 GitHub 上的文件，不可撤销。</p>
                        </div>
                        <div class="b3-dialog__action">
                            <button class="b3-button b3-button--cancel" id="cancelDeleteBtn">取消</button>
                            <div class="fn__space"></div>
                            <button class="b3-button b3-button--text b3-button--error" id="confirmDeleteBtn">确认删除</button>
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

            showMessage("正在删除发布内容...", 3000, "info");

            const config = this.settings.getConfig();
            const [owner, repo] = config.repository.split('/');
            const githubAPI = new GitHubAPI(config.accessToken);

            // 删除整个笔记目录（包括Markdown文件和图片）
            const noteDirectoryPath = `${config.basePath}/${publishRecord.folderName}`;
            const deleteResult = await githubAPI.deleteFile(
                owner,
                repo,
                config.branch,
                noteDirectoryPath,
                `doc: 删除上传目录 ${publishRecord.folderName}`
            );

            if (deleteResult.error) {
                console.error("Note directory deletion failed:", deleteResult);
                throw new Error(`删除失败: ${deleteResult.error}`);
            }

            // 从发布记录中移除
            delete this.publishRecords[publishRecord.noteId];
            
            // 保存更新后的发布记录
            await this.savePublishRecordsToStorage();

            showMessage("删除发布成功！", 3000);
            console.log("Publish deletion completed successfully");

        } catch (error) {
            console.error("Delete publish failed:", error);
            showMessage(`删除失败: ${error.message}`, 5000, "error");
        }
    }

    /**
     * 保存发布记录到存储
     */
    private async savePublishRecordsToStorage() {
        try {
            const storageData = JSON.stringify(this.publishRecords);
            console.log("Saving all publish records to storage:", PUBLISH_RECORDS_STORAGE, this.publishRecords);
            
            // 使用思源笔记插件的 saveData 方法
            await this.saveData(PUBLISH_RECORDS_STORAGE, storageData);
            console.log("All publish records saved successfully");
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
                title: "发布到 GitHub",
                content: `
                    <div class="b3-dialog__content">
                        <div class="b3-label" style="display: flex; align-items: center; gap: 8px;">
                            <span>上传目录：</span>
                            <input type="text" id="fileNameInput"
                                   value="${noteTitle}"
                                   class="b3-text-field"
                                   placeholder="请输入上传目录名" style="flex: 1;">
                        </div>
                        ${config.frontMatter && config.frontMatter.trim() ? `
                        <div class="b3-label" style="margin-top: 8px;">
                            <span>Front Matter：</span>
                            <textarea id="frontMatterInput" style="margin-top: 8px; padding: 12px; background: var(--b3-theme-surface-light); border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-height: 200px; overflow-y: auto; width: 100%; min-height: 100px; resize: vertical;"></textarea>
                        </div>
                        ` : ''}
                        <div class="b3-label fn__secondary" style="margin-top: 8px; font-size: 12px; color: var(--b3-theme-on-surface-light);" id="filePathPreview">
                            上传至: github.com/${config.repository}/${config.basePath}/${noteTitle}/index.md
                            ${config.customDomain ? `<br>发布为: ${config.customDomain}/${noteTitle}` : ''}
                        </div>
                    </div>
                    <div class="b3-dialog__action">
                        <button class="b3-button b3-button--cancel" id="cancelBtn">取消</button>
                        <div class="fn__space"></div>
                        <button class="b3-button b3-button--text" id="publishBtn">发布</button>
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
                    filePathPreview.innerHTML = `上传至: github.com/${config.repository}/${config.basePath}/${fileName}/index.md<br>发布为: ${config.customDomain}/${fileName}`;
                } else {
                    filePathPreview.textContent = `上传至: github.com/${config.repository}/${config.basePath}/${fileName}/index.md`;
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
                    showMessage("请输入上传目录名", 3000, "error");
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
     * 发布到 GitHub
     */
    private async publishToGitHub(config: GitHubConfig, folderName: string, processedContent: { content: string, images: ImageInfo[] }, progressCallback?: () => void, frontMatter?: string) {
        const [owner, repo] = config.repository.split('/');
        const githubAPI = new GitHubAPI(config.accessToken);

        // 创建文件路径
        const filePath = `${config.basePath}/${folderName}/index.md`;
        
        // 直接使用已处理好的内容（Front Matter已经在showPublishDialog中处理过）
        let finalContent = processedContent.content;
        
        // 上传 Markdown 文件
        const uploadResult = await githubAPI.uploadFile(
            owner,
            repo,
            config.branch,
            filePath,
            finalContent,
            `doc: 发布笔记 ${folderName}`
        );

        if (uploadResult.error) {
            console.error("Markdown upload failed:", uploadResult);
            throw new Error(`Markdown upload failed: ${uploadResult.error}`);
        } else {
            console.log("Markdown upload successful:", uploadResult.data);
        }

        // 更新进度（Markdown文件上传完成）
        if (progressCallback) {
            progressCallback();
        }

        // 上传图片文件
        for (const image of processedContent.images) {
            if (image.content) {
                const imagePath = `${config.basePath}/${folderName}/${image.filename}`;
                const imageContent = Array.from(new Uint8Array(image.content))
                    .map(byte => String.fromCharCode(byte))
                    .join('');
                
                const imageUploadResult = await githubAPI.uploadFile(
                    owner,
                    repo,
                    config.branch,
                    imagePath,
                    btoa(imageContent),
                    `doc: 发布笔记 ${folderName}`
                );

                if (imageUploadResult.error) {
                    console.warn(`Image upload failed: ${image.filename}`, imageUploadResult.error);
                }
                
                // 更新进度（每个图片文件上传完成）
                if (progressCallback) {
                    progressCallback();
                }
            }
        }
    }

    /**
     * 加载发布记录
     */
    private async loadPublishRecords() {
        try {
            // 使用思源笔记插件的 loadData 方法
            const storageData = await this.loadData(PUBLISH_RECORDS_STORAGE);
            console.log("Loading publish records from storage:", storageData);
            
            if (storageData !== null && storageData !== undefined && storageData !== '') {
                try {
                    const parsedData = JSON.parse(storageData);
                    // 确保解析后的数据是对象格式
                    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
                        this.publishRecords = parsedData;
                        console.log("Publish records loaded successfully:", Object.keys(this.publishRecords));
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
                console.log("No publish records found in storage");
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
            markdownUrl: `https://github.com/${config.repository}/blob/${config.branch}/${config.basePath}/${folderName}/index.md`,
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
            console.log("Saving publish records to storage:", PUBLISH_RECORDS_STORAGE, this.publishRecords);
            
            // 使用思源笔记插件的 saveData 方法
            await this.saveData(PUBLISH_RECORDS_STORAGE, storageData);
            console.log("Publish records saved successfully");
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
        console.log("Current note ID:", noteId);
        
        // 直接通过 noteId 访问发布记录
        const record = this.publishRecords[noteId] || null;
        
        // 双重验证：确保记录确实属于当前笔记
        if (record && record.noteId === noteId) {
            console.log("Current note has publish record:", record.noteTitle);
            return record;
        }
        
        console.log("Current note has no publish record");
        return null;
    }


}
