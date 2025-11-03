/**
 * GitHub 相关类型定义
 */

// GitHub 配置接口
export interface GitHubConfig {
    username: string;
    accessToken: string;
    repository: string; // format: "owner/repo"
    branch: string;    // default: "main"
    basePath: string;  // e.g., "content/posts"
    customDomain?: string; // e.g., "https://example.github.com"
    frontMatter?: string; // Front matter 元数据
}

// GitHub API 响应类型
export interface GitHubAPIResponse {
    status: number;
    data?: any;
    error?: string;
}

// GitHub 文件上传参数
export interface GitHubFileUploadParams {
    owner: string;
    repo: string;
    branch: string;
    path: string;
    content: string;
    message: string;
}

// GitHub 文件上传响应
export interface GitHubFileUploadResponse {
    content: {
        name: string;
        path: string;
        sha: string;
        size: number;
        url: string;
        html_url: string;
        git_url: string;
        download_url: string;
        type: string;
        _links: {
            self: string;
            git: string;
            html: string;
        };
    };
    commit: {
        sha: string;
        node_id: string;
        url: string;
        html_url: string;
        author: {
            name: string;
            email: string;
            date: string;
        };
        committer: {
            name: string;
            email: string;
            date: string;
        };
        message: string;
        tree: {
            sha: string;
            url: string;
        };
        parents: Array<{
            sha: string;
            url: string;
            html_url: string;
        }>;
        verification: {
            verified: boolean;
            reason: string;
            signature: string | null;
            payload: string | null;
        };
    };
}

// GitHub 错误响应
export interface GitHubErrorResponse {
    message: string;
    documentation_url?: string;
    errors?: Array<{
        resource: string;
        field: string;
        code: string;
    }>;
}

// 图片信息接口
export interface ImageInfo {
    originalUrl: string;
    filename: string;
    localPath?: string;
    content?: ArrayBuffer;
}

// 发布结果接口
export interface PublishResult {
    success: boolean;
    message: string;
    markdownUrl?: string;
    imageUrls?: string[];
    error?: string;
}

// 笔记选择状态
export interface NoteSelectionState {
    hasSelection: boolean;
    isSingleNote: boolean;
    selectedNoteId?: string;
    selectedNoteTitle?: string;
}

// 发布记录接口
export interface PublishRecord {
    noteId: string;
    noteTitle: string;
    folderName: string;
    publishTime: number;
    markdownUrl: string;
    publishUrl?: string; // 自定义域名访问地址
    config: {
        repository: string;
        basePath: string;
        customDomain?: string;
    };
}

// 发布记录存储接口
export interface PublishRecords {
    [noteId: string]: PublishRecord;
}