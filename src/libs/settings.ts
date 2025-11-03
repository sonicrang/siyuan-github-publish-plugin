/**
 * 设置管理模块 - 管理 GitHub 配置
 */

import { SettingUtils } from "./setting-utils";
import { GitHubAPI } from "./github-api";
import { showMessage } from "siyuan";
import type { GitHubConfig } from "../types/github";

class GitHubSettings {
    private settingUtils: SettingUtils;
    private storageName = "github-publish-config";

    constructor(plugin: any) {
        this.settingUtils = new SettingUtils({
            plugin: plugin,
            name: this.storageName,
            validateCallback: (data) => {
                const validation = this.validateConfig(data);
                if (!validation.isValid) {
                    this.showMessage(`配置验证失败: ${validation.errors.join(", ")}`, "error");
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
            title: "GitHub 用户名<span style=\"color: red;\">*</span>",
            description: "您的 GitHub 用户名",
            placeholder: "请输入 GitHub 用户名",
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
            title: "GitHub Access Token<span style=\"color: red;\">*</span>",
            description: `<a href="https://github.com/settings/tokens" target="_blank" style="color: var(--b3-theme-primary); text-decoration: underline;">GitHub Personal Access Token</a>，需要 repo 权限`,
            placeholder: "请输入 GitHub Access Token",
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
            title: "仓库地址<span style=\"color: red;\">*</span>",
            description: "格式: username/repository",
            placeholder: "例如: yourname/your-repo",
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
            title: "分支名称<span style=\"color: red;\">*</span>",
            description: "GitHub 仓库分支",
            placeholder: "默认为 main",
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
            title: "存储路径",
            description: "文件存储的基础路径",
            placeholder: "例如: content/posts",
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
            title: "自定义域名",
            description: "笔记网站的自定义域名，如 https://example.github.com",
            placeholder: "例如: https://example.github.com",
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
            title: "Front Matter 元数据",
            description: "在Markdown文件前添加元数据，支持YAML格式。",
            placeholder: "输入YAML格式的Front matter内容",
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
            title: "测试连接",
            description: "测试 GitHub 配置是否有效",
            button: {
                label: "测试连接",
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
        console.log(`Setting ${key} saved:`, value);
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
            "githubUsername": "GitHub 用户名",
            "accessToken": "GitHub Access Token",
            "repository": "仓库地址",
            "branch": "分支名称"
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
        return {
            username: this.settingUtils.get("githubUsername") || "",
            accessToken: this.settingUtils.get("accessToken") || "",
            repository: this.settingUtils.get("repository") || "",
            branch: this.settingUtils.get("branch") || "main",
            basePath: this.settingUtils.get("basePath") || "content/posts",
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
            errors.push("GitHub 用户名不能为空");
        }

        if (!accessToken) {
            errors.push("Access Token 不能为空");
        }

        if (!repository) {
            errors.push("仓库地址不能为空");
        } else if (!this.isValidRepositoryFormat(repository)) {
            errors.push("仓库地址格式不正确，应为 username/repo");
        }

        if (!branch) {
            errors.push("分支名称不能为空");
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
            this.showMessage(`配置错误: ${validation.errors.join(", ")}`, "error");
            return;
        }

        try {
            this.showMessage("正在测试连接...", "info");

            const [owner, repo] = config.repository.split('/');
            const githubAPI = new GitHubAPI(config.accessToken);

            // 测试认证
            const authResult = await githubAPI.verifyAuth();
            if (authResult.error) {
                this.showMessage(`认证失败: ${authResult.error}`, "error");
                return;
            }

            // 测试仓库访问
            const repoResult = await githubAPI.verifyRepo(owner, repo);
            if (repoResult.error) {
                this.showMessage(`仓库访问失败: ${repoResult.error}`, "error");
                return;
            }

            // 测试分支访问
            const branchResult = await githubAPI.verifyBranch(owner, repo, config.branch);
            if (branchResult.error) {
                this.showMessage(`分支访问失败: ${branchResult.error}`, "error");
                return;
            }

            this.showMessage("连接测试成功！配置有效。", "success");

        } catch (error) {
            this.showMessage(`连接测试失败: ${error.message}`, "error");
        }
    }


    /**
     * 显示消息
     */
    private showMessage(message: string, type: "info" | "success" | "error" = "info") {
        console.log(`[${type}] ${message}`);
        
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