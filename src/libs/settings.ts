/**
 * 设置管理模块 - 管理 GitHub 配置
 */

import { SettingUtils } from "./setting-utils";
import { GitHubAPI } from "./github-api";
import { showMessage } from "siyuan";
import type { GitHubConfig } from "../types/github";

class GitHubSettings {
    private settingUtils: SettingUtils;
    private storageName = "github-publish-config.json";
    private plugin: any;

    constructor(plugin: any) {
        this.plugin = plugin;
        this.settingUtils = new SettingUtils({
            plugin: plugin,
            name: this.storageName,
            validateCallback: (data) => {
                const validation = this.validateConfig(data);
                if (!validation.isValid) {
                    this.showMessage(`${this.plugin.i18n.configValidationFailed}: ${validation.errors.join(", ")}`, "error");
                    return false; // 验证失败，阻止保存
                }
                return true; // 验证成功，允许保存
            }
        });
    }

    /**
     * 初始化设置面板
     */
    initializeSettings() {
        this.settingUtils.addItem({
            key: "githubUsername",
            value: "",
            type: "textinput",
            title: this.plugin.i18n.githubUsername + "<span style=\"color: red;\">*</span>",
            description: this.plugin.i18n.githubUsername,
            placeholder: this.plugin.i18n.githubUsername,
            action: {
                callback: () => {
                    this.saveSetting("githubUsername");
                }
            }
        });

        this.settingUtils.addItem({
            key: "accessToken",
            value: "",
            type: "textinput",
            title: this.plugin.i18n.accessToken + "<span style=\"color: red;\">*</span>",
            description: `<a href="https://github.com/settings/tokens" target="_blank" style="color: var(--b3-theme-primary); text-decoration: underline;">GitHub Personal Access Token</a> ${this.plugin.i18n.importantNote.replace("<strong>Note:</strong>", "")}`,
            placeholder: this.plugin.i18n.accessToken,
            action: {
                callback: () => {
                    this.saveSetting("accessToken");
                }
            }
        });

        this.settingUtils.addItem({
            key: "repository",
            value: "",
            type: "textinput",
            title: this.plugin.i18n.repository + "<span style=\"color: red;\">*</span>",
            description: this.plugin.i18n.validationErrors.repoFormat,
            placeholder: this.plugin.i18n.validationErrors.repoFormat.replace("应为 ", ""),
            action: {
                callback: () => {
                    this.saveSetting("repository");
                }
            }
        });

        this.settingUtils.addItem({
            key: "branch",
            value: "main",
            type: "textinput",
            title: this.plugin.i18n.branch + "<span style=\"color: red;\">*</span>",
            description: this.plugin.i18n.branch,
            placeholder: this.plugin.i18n.branch,
            action: {
                callback: () => {
                    this.saveSetting("branch");
                }
            }
        });

        this.settingUtils.addItem({
            key: "basePath",
            value: "content/posts",
            type: "textinput",
            title: this.plugin.i18n.basePath,
            description: this.plugin.i18n.basePath,
            placeholder: this.plugin.i18n.basePath,
            action: {
                callback: () => {
                    this.saveSetting("basePath");
                }
            }
        });

        this.settingUtils.addItem({
            key: "customDomain",
            value: "",
            type: "textinput",
            title: this.plugin.i18n.customDomain || "Custom Domain",
            description: this.plugin.i18n.customDomain || "Custom domain for your notes website",
            placeholder: this.plugin.i18n.customDomain || "e.g., https://example.github.com",
            action: {
                callback: () => {
                    this.saveSetting("customDomain");
                }
            }
        });

        this.settingUtils.addItem({
            key: "frontMatter",
            value: "",
            type: "textarea",
            title: this.plugin.i18n.frontMatter || "Front Matter",
            description: this.plugin.i18n.frontMatter || "Add metadata in YAML format at the beginning of Markdown files",
            placeholder: this.plugin.i18n.frontMatter || "Enter YAML front matter content",
            action: {
                callback: () => {
                    this.saveSetting("frontMatter");
                }
            }
        });

        this.settingUtils.addItem({
            key: "testConnection",
            value: "",
            type: "button",
            title: this.plugin.i18n.testConnection,
            description: this.plugin.i18n.testConnection,
            button: {
                label: this.plugin.i18n.testConnection,
                callback: () => {
                    this.testConnection();
                }
            }
        });

        // 加载已有配置
        this.loadSettings();
    }

    /**
     * 保存单个设置项
     */
    private saveSetting(key: string) {
        const value = this.settingUtils.take(key);
        
        // 只在有值时验证必填项（避免用户正在输入时频繁提示）
        if (this.isRequiredField(key)) {
            if (!value) {
                // 值为空时不提示，让用户继续输入
                return;
            }
        }
        
        this.settingUtils.set(key, value);
    }
    
    /**
     * 判断是否为必填字段
     */
    private isRequiredField(key: string): boolean {
        const requiredFields = ["githubUsername", "accessToken", "repository", "branch"];
        return requiredFields.includes(key);
    }
    
    /**
     * 获取字段显示名称
     */
    private getFieldName(key: string): string {
        const fieldNames: Record<string, string> = {
            "githubUsername": this.plugin.i18n.githubUsername,
            "accessToken": this.plugin.i18n.accessToken,
            "repository": this.plugin.i18n.repository,
            "branch": this.plugin.i18n.branch
        };
        return fieldNames[key] || key;
    }

    /**
     * 加载所有设置
     */
    loadSettings(): GitHubConfig {
        try {
            this.settingUtils.load();
            return this.getConfig();
        } catch (error) {
            console.error("Error loading settings:", error);
            return this.getDefaultConfig();
        }
    }

    /**
     * 获取当前配置
     */
    getConfig(): GitHubConfig {
        const basePath = this.settingUtils.get("basePath");
        return {
            username: this.settingUtils.get("githubUsername") || "",
            accessToken: this.settingUtils.get("accessToken") || "",
            repository: this.settingUtils.get("repository") || "",
            branch: this.settingUtils.get("branch") || "main",
            basePath: basePath !== undefined && basePath !== null ? basePath : "content/posts",
            customDomain: this.settingUtils.get("customDomain") || "",
            frontMatter: this.settingUtils.get("frontMatter") || ""
        };
    }

    /**
     * 获取默认配置
     */
    private getDefaultConfig(): GitHubConfig {
        return {
            username: "",
            accessToken: "",
            repository: "",
            branch: "main",
            basePath: "content/posts",
            customDomain: "",
            frontMatter: ""
        };
    }

    /**
     * 验证配置是否完整
     */
    validateConfig(config: any): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // 兼容两种格式：GitHubConfig 对象和 SettingUtils 的普通对象
        const username = config.username || config.githubUsername;
        const accessToken = config.accessToken;
        const repository = config.repository;
        const branch = config.branch;

        if (!username) {
            errors.push(this.plugin.i18n.validationErrors.usernameRequired);
        }

        if (!accessToken) {
            errors.push(this.plugin.i18n.validationErrors.tokenRequired);
        }

        if (!repository) {
            errors.push(this.plugin.i18n.validationErrors.repoRequired);
        } else if (!this.isValidRepositoryFormat(repository)) {
            errors.push(this.plugin.i18n.validationErrors.repoFormat);
        }

        if (!branch) {
            errors.push(this.plugin.i18n.validationErrors.branchRequired);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 验证仓库地址格式
     */
    private isValidRepositoryFormat(repo: string): boolean {
        return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo);
    }

    /**
     * 测试 GitHub 连接
     */
    private async testConnection() {
        // 首先获取最新的设置值（不应用保存，避免重复验证）
        const currentValues = {
            githubUsername: this.settingUtils.take("githubUsername", false),
            accessToken: this.settingUtils.take("accessToken", false),
            repository: this.settingUtils.take("repository", false),
            branch: this.settingUtils.take("branch", false)
        };
        
        const config = {
            githubUsername: currentValues.githubUsername,
            accessToken: currentValues.accessToken,
            repository: currentValues.repository,
            branch: currentValues.branch
        };
        
        const validation = this.validateConfig(config);

        if (!validation.isValid) {
            this.showMessage(`${this.plugin.i18n.configError}: ${validation.errors.join(", ")}`, "error");
            return;
        }

        try {
            this.showMessage(this.plugin.i18n.testingConnection, "info");

            const [owner, repo] = config.repository.split('/');
            const githubAPI = new GitHubAPI(config.accessToken);

            // 测试认证
            const authResult = await githubAPI.verifyAuth();
            if (authResult.error) {
                this.showMessage(`${this.plugin.i18n.authFailed}: ${authResult.error}`, "error");
                return;
            }

            // 测试仓库访问
            const repoResult = await githubAPI.verifyRepo(owner, repo);
            if (repoResult.error) {
                this.showMessage(`${this.plugin.i18n.repoAccessFailed}: ${repoResult.error}`, "error");
                return;
            }

            // 测试分支访问
            const branchResult = await githubAPI.verifyBranch(owner, repo, config.branch);
            if (branchResult.error) {
                this.showMessage(`${this.plugin.i18n.branchAccessFailed}: ${branchResult.error}`, "error");
                return;
            }

            this.showMessage(this.plugin.i18n.connectionSuccess, "success");

        } catch (error) {
            this.showMessage(`${this.plugin.i18n.connectionFailed}: ${error.message}`, "error");
        }
    }


    /**
     * 显示消息
     */
    private showMessage(message: string, type: "info" | "success" | "error" = "info") {
        // 使用思源的 showMessage 函数
        if (typeof showMessage === 'function') {
            if (type === 'error') {
                showMessage(message, 5000, 'error');
            } else {
                // 思源的 showMessage 只支持 info 和 error 类型
                showMessage(message);
            }
        }
    }

    /**
     * 打开设置面板
     */
    openSettings() {
        // 使用思源笔记的 Setting 打开设置面板
        // @ts-ignore - 思源笔记的 setting.open 方法可能需要参数
        this.settingUtils.plugin.setting.open();
    }
}

export { GitHubSettings };