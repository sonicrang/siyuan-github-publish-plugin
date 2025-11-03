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
            // 检查内容是否已经是base64编码（图片内容）
            let base64Content;
            if (this.isBase64(content)) {
                // 如果已经是base64，直接使用
                base64Content = content;
            } else {
                // 对于文本内容，进行base64编码
                base64Content = btoa(unescape(encodeURIComponent(content)));
            }

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
            
            // 如果文件不存在（404），直接返回成功，因为目标就是删除文件
            if (fileInfo.status === 404) {
                return {
                    status: 200,
                    data: { message: 'File already deleted or not found' }
                };
            }
            
            // 如果其他错误，返回错误信息
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

    /**
     * 获取目录内容
     */
    async getDirectoryContents(
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

            if (response.ok) {
                const contents = await response.json();
                return {
                    status: response.status,
                    data: contents
                };
            } else {
                const errorData = await response.json();
                return {
                    status: response.status,
                    error: errorData.message || 'Failed to get directory contents'
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
     * 删除整个目录（使用Git Data API，只创建一个提交）
     */
    async deleteDirectory(
        owner: string,
        repo: string,
        branch: string,
        path: string,
        message: string
    ): Promise<GitHubAPIResponse> {
        try {
            // 首先检查目录是否存在
            const contentsResult = await this.getDirectoryContents(owner, repo, branch, path);
            
            // 如果目录不存在（404），直接返回成功
            if (contentsResult.status === 404) {
                return {
                    status: 200,
                    data: { message: 'Directory already deleted or not found' }
                };
            }
            
            if (contentsResult.error) {
                return contentsResult;
            }

            // 使用Git Data API创建一个删除整个目录的提交
            // 获取当前分支的引用
            const refResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                }
            });

            if (!refResponse.ok) {
                const errorData = await refResponse.json();
                return {
                    status: refResponse.status,
                    error: errorData.message || 'Failed to get branch reference'
                };
            }

            const refData = await refResponse.json();
            const baseCommitSha = refData.object.sha;

            // 获取基础提交
            const commitResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/commits/${baseCommitSha}`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                }
            });

            if (!commitResponse.ok) {
                const errorData = await commitResponse.json();
                return {
                    status: commitResponse.status,
                    error: errorData.message || 'Failed to get base commit'
                };
            }

            const commitData = await commitResponse.json();
            const baseTreeSha = commitData.tree.sha;

            // 创建一个新的树，排除要删除的目录
            const newTreeResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/trees`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                },
                body: JSON.stringify({
                    base_tree: baseTreeSha,
                    tree: [
                        {
                            path: path,
                            mode: '040000', // 目录模式
                            type: 'tree',
                            sha: null // 设置为null表示删除
                        }
                    ]
                })
            });

            if (!newTreeResponse.ok) {
                const errorData = await newTreeResponse.json();
                return {
                    status: newTreeResponse.status,
                    error: errorData.message || 'Failed to create new tree'
                };
            }

            const newTreeData = await newTreeResponse.json();

            // 创建提交
            const newCommitResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/commits`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                },
                body: JSON.stringify({
                    message: message,
                    tree: newTreeData.sha,
                    parents: [baseCommitSha]
                })
            });

            if (!newCommitResponse.ok) {
                const errorData = await newCommitResponse.json();
                return {
                    status: newCommitResponse.status,
                    error: errorData.message || 'Failed to create commit'
                };
            }

            const newCommitData = await newCommitResponse.json();

            // 更新分支引用
            const updateRefResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                },
                body: JSON.stringify({
                    sha: newCommitData.sha,
                    force: false
                })
            });

            if (!updateRefResponse.ok) {
                const errorData = await updateRefResponse.json();
                return {
                    status: updateRefResponse.status,
                    error: errorData.message || 'Failed to update branch reference'
                };
            }

            return {
                status: 200,
                data: { message: 'Directory deleted successfully' }
            };
        } catch (error) {
            return {
                status: 0,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * 批量上传文件到 GitHub（使用 Git Tree API，只创建一个提交）
     */
    async uploadFiles(
        owner: string,
        repo: string,
        branch: string,
        files: Array<{
            path: string;
            content: string;
            mode?: string; // 文件模式，默认为 '100644' (普通文件)
        }>,
        message: string
    ): Promise<GitHubAPIResponse> {
        try {
            // 获取当前分支的引用
            const refResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                }
            });

            if (!refResponse.ok) {
                const errorData = await refResponse.json();
                return {
                    status: refResponse.status,
                    error: errorData.message || 'Failed to get branch reference'
                };
            }

            const refData = await refResponse.json();
            const baseCommitSha = refData.object.sha;

            // 获取基础提交
            const commitResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/commits/${baseCommitSha}`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                }
            });

            if (!commitResponse.ok) {
                const errorData = await commitResponse.json();
                return {
                    status: commitResponse.status,
                    error: errorData.message || 'Failed to get base commit'
                };
            }

            const commitData = await commitResponse.json();
            const baseTreeSha = commitData.tree.sha;

            // 首先为所有文件创建 blob 对象
            const blobPromises = files.map(async (file) => {
                // 检查内容是否已经是base64编码（图片内容）
                let base64Content;
                if (this.isBase64(file.content)) {
                    // 如果已经是base64，直接使用
                    base64Content = file.content;
                } else {
                    // 对于文本内容，进行base64编码
                    base64Content = btoa(unescape(encodeURIComponent(file.content)));
                }

                const blobResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/blobs`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                    },
                    body: JSON.stringify({
                        content: base64Content,
                        encoding: 'base64'
                    })
                });

                if (!blobResponse.ok) {
                    const errorData = await blobResponse.json();
                    throw new Error(`Failed to create blob for ${file.path}: ${errorData.message}`);
                }

                const blobData = await blobResponse.json();
                return {
                    path: file.path,
                    mode: file.mode || '100644', // 普通文件
                    type: 'blob',
                    sha: blobData.sha
                };
            });

            // 等待所有 blob 创建完成
            const tree = await Promise.all(blobPromises);

            // 创建新的树
            const newTreeResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/trees`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                },
                body: JSON.stringify({
                    base_tree: baseTreeSha,
                    tree: tree
                })
            });

            if (!newTreeResponse.ok) {
                const errorData = await newTreeResponse.json();
                return {
                    status: newTreeResponse.status,
                    error: errorData.message || 'Failed to create new tree'
                };
            }

            const newTreeData = await newTreeResponse.json();

            // 创建提交
            const newCommitResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/commits`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                },
                body: JSON.stringify({
                    message: message,
                    tree: newTreeData.sha,
                    parents: [baseCommitSha]
                })
            });

            if (!newCommitResponse.ok) {
                const errorData = await newCommitResponse.json();
                return {
                    status: newCommitResponse.status,
                    error: errorData.message || 'Failed to create commit'
                };
            }

            const newCommitData = await newCommitResponse.json();

            // 更新分支引用
            const updateRefResponse = await fetch(`${this.baseURL}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'SiYuan-GitHub-Publish-Plugin'
                },
                body: JSON.stringify({
                    sha: newCommitData.sha,
                    force: false
                })
            });

            if (!updateRefResponse.ok) {
                const errorData = await updateRefResponse.json();
                return {
                    status: updateRefResponse.status,
                    error: errorData.message || 'Failed to update branch reference'
                };
            }

            return {
                status: 200,
                data: { message: 'Files uploaded successfully in single commit' }
            };
        } catch (error) {
            return {
                status: 0,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * 检查字符串是否为有效的base64编码
     */
    private isBase64(str: string): boolean {
        try {
            // base64字符串通常只包含特定字符
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Regex.test(str)) {
                return false;
            }
            
            // 尝试解码再编码来验证
            const decoded = atob(str);
            const reencoded = btoa(decoded);
            return reencoded === str;
        } catch (error) {
            return false;
        }
    }
}

export { GitHubAPI };