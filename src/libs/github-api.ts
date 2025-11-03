/**
 * GitHub API 封装模块
 */
import type { GitHubAPIResponse } from "../types/github";

class GitHubAPI {
    private baseURL = 'https://api.github.com';
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    /**
     * 验证 GitHub 认证
     */
    async verifyAuth(): Promise<GitHubAPIResponse> {
        try {
            const response = await fetch(`${this.baseURL}/user`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                return {
                    status: response.status,
                    data: userData
                };
            } else {
                const errorData = await response.json();
                return {
                    status: response.status,
                    error: errorData.message || 'Authentication failed'
                };
            }
        } catch (error) {
            return {
                status: 0,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * 验证仓库是否存在且有权限
     */
    async verifyRepo(owner: string, repo: string): Promise<GitHubAPIResponse> {
        try {
            const response = await fetch(`${this.baseURL}/repos/${owner}/${repo}`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                }
            });

            if (response.ok) {
                const repoData = await response.json();
                return {
                    status: response.status,
                    data: repoData
                };
            } else {
                const errorData = await response.json();
                return {
                    status: response.status,
                    error: errorData.message || 'Repository not found or no access'
                };
            }
        } catch (error) {
            return {
                status: 0,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * 验证分支是否存在
     */
    async verifyBranch(owner: string, repo: string, branch: string): Promise<GitHubAPIResponse> {
        try {
            const response = await fetch(`${this.baseURL}/repos/${owner}/${repo}/branches/${branch}`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                }
            });

            if (response.ok) {
                const branchData = await response.json();
                return {
                    status: response.status,
                    data: branchData
                };
            } else {
                const errorData = await response.json();
                return {
                    status: response.status,
                    error: errorData.message || 'Branch not found'
                };
            }
        } catch (error) {
            return {
                status: 0,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * 上传文件到 GitHub
     */
    async uploadFile(
        owner: string,
        repo: string,
        branch: string,
        path: string,
        content: string,
        message: string
    ): Promise<GitHubAPIResponse> {
        try {
            // 将内容转换为 base64
            const base64Content = btoa(unescape(encodeURIComponent(content)));

            const response = await fetch(`${this.baseURL}/repos/${owner}/${repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                },
                body: JSON.stringify({
                    message: message,
                    content: base64Content,
                    branch: branch
                })
            });

            if (response.ok) {
                const result = await response.json();
                return {
                    status: response.status,
                    data: result
                };
            } else {
                const errorData = await response.json();
                return {
                    status: response.status,
                    error: errorData.message || 'File upload failed'
                };
            }
        } catch (error) {
            return {
                status: 0,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * 检查文件是否存在
     */
    async checkFileExists(
        owner: string,
        repo: string,
        branch: string,
        path: string
    ): Promise<GitHubAPIResponse> {
        try {
            const response = await fetch(`${this.baseURL}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                }
            });

            return {
                status: response.status,
                data: response.ok ? await response.json() : null
            };
        } catch (error) {
            return {
                status: 0,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * 创建目录（通过创建 README 文件）
     */
    async createDirectory(
        owner: string,
        repo: string,
        branch: string,
        path: string,
        message: string = 'Create directory'
    ): Promise<GitHubAPIResponse> {
        const readmePath = `${path}/README.md`;
        const readmeContent = `# ${path.split('/').pop()}\n\nThis directory was created by SiYuan GitHub Publish Plugin.`;

        return this.uploadFile(owner, repo, branch, readmePath, readmeContent, message);
    }

    /**
     * 删除GitHub上的文件
     */
    async deleteFile(
        owner: string,
        repo: string,
        branch: string,
        path: string,
        message: string
    ): Promise<GitHubAPIResponse> {
        try {
            // 首先获取文件的SHA值
            const fileInfo = await this.checkFileExists(owner, repo, branch, path);
            
            if (fileInfo.status !== 200 || !fileInfo.data) {
                return {
                    status: fileInfo.status,
                    error: fileInfo.error || 'File not found'
                };
            }

            const sha = fileInfo.data.sha;

            const response = await fetch(`${this.baseURL}/repos/${owner}/${repo}/contents/${path}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                },
                body: JSON.stringify({
                    message: message,
                    sha: sha,
                    branch: branch
                })
            });

            if (response.ok) {
                const result = await response.json();
                return {
                    status: response.status,
                    data: result
                };
            } else {
                const errorData = await response.json();
                return {
                    status: response.status,
                    error: errorData.message || 'File deletion failed'
                };
            }
        } catch (error) {
            return {
                status: 0,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * 格式化错误信息
     */
    static formatError(error: any): string {
        if (error.response?.status === 404) {
            return "仓库不存在或无权访问";
        } else if (error.response?.status === 403) {
            return "API 速率限制或权限不足";
        } else if (error.response?.status === 401) {
            return "认证失败，请检查 Access Token";
        } else {
            return error.message || "未知错误";
        }
    }
}

export { GitHubAPI };