/**
 * 内容处理器模块 - 处理 Markdown 内容和图片
 */

// 移除 siyuan 导入，使用全局的 fetchPost
// import { fetchPost } from "siyuan";
import type { ImageInfo, NoteSelectionState } from "../types/github";

class ContentProcessor {
    
    /**
     * 处理 Markdown 内容中的图片链接
     * 提取图片并重写链接为相对路径
     */
    static async processMarkdownImages(markdown: string, blockId: string): Promise<{ content: string, images: ImageInfo[] }> {
        const images: ImageInfo[] = [];
        let processedContent = markdown;
        
        // 匹配 Markdown 图片语法 ![alt](url)
        const markdownImageRegex = /!\[(.*?)\]\((.*?)\)/g;
        let match;
        
        while ((match = markdownImageRegex.exec(markdown)) !== null) {
            const [fullMatch, altText, imageUrl] = match;
            
            if (imageUrl && this.isLocalImage(imageUrl)) {
                try {
                    const imageInfo = await this.processImage(imageUrl, blockId);
                    if (imageInfo) {
                        images.push(imageInfo);
                        
                        // 重写图片链接为相对路径
                        const newUrl = `${imageInfo.filename}`;
                        processedContent = processedContent.replace(fullMatch, `![${altText}](${newUrl})`);
                    }
                } catch (error) {
                    console.warn(`Failed to process image: ${imageUrl}`, error);
                }
            }
        }
        
        // 匹配 HTML img 标签
        const htmlImageRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
        let htmlMatch;
        
        while ((htmlMatch = htmlImageRegex.exec(markdown)) !== null) {
            const [fullMatch, imageUrl] = htmlMatch;
            
            if (imageUrl && this.isLocalImage(imageUrl)) {
                try {
                    const imageInfo = await this.processImage(imageUrl, blockId);
                    if (imageInfo) {
                        images.push(imageInfo);
                        
                        // 重写图片链接为相对路径
                        const newUrl = `${imageInfo.filename}`;
                        processedContent = processedContent.replace(
                            `src="${imageUrl}"`,
                            `src="${newUrl}"`
                        );
                    }
                } catch (error) {
                    console.warn(`Failed to process HTML image: ${imageUrl}`, error);
                }
            }
        }
        
        return {
            content: processedContent,
            images: images
        };
    }
    
    /**
     * 判断是否为本地图片（非网络图片）
     */
    private static isLocalImage(url: string): boolean {
        return !url.startsWith('http://') && 
               !url.startsWith('https://') && 
               !url.startsWith('//') &&
               !url.startsWith('data:');
    }
    
    /**
     * 处理单个图片
     */
    private static async processImage(imageUrl: string, blockId: string): Promise<ImageInfo | null> {
        try {
            // 获取图片文件名
            const filename = this.getImageFilename(imageUrl);
            
            // 获取图片内容
            const imageContent = await this.getImageContent(imageUrl, blockId);
            
            if (!imageContent) {
                return null;
            }
            
            return {
                originalUrl: imageUrl,
                filename: filename,
                content: imageContent
            };
        } catch (error) {
            console.error('Error processing image:', error);
            return null;
        }
    }
    
    /**
     * 从 URL 中提取文件名
     */
    private static getImageFilename(url: string): string {
        // 移除查询参数
        const cleanUrl = url.split('?')[0];
        
        // 获取文件名
        const parts = cleanUrl.split('/');
        let filename = parts[parts.length - 1];
        
        // 确保文件名有扩展名
        if (!filename.includes('.')) {
            filename = `${filename}.png`;
        }
        
        // 清理文件名（移除特殊字符）
        filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        
        // 添加时间戳避免重名
        const timestamp = Date.now();
        const nameParts = filename.split('.');
        const ext = nameParts.pop();
        return `${nameParts.join('.')}_${timestamp}.${ext}`;
    }
    
    /**
     * 获取图片内容
     */
    private static async getImageContent(url: string, blockId: string): Promise<ArrayBuffer | null> {
        try {
            // 如果是相对路径，可能需要通过思源 API 获取
            if (url.startsWith('/')) {
                // 对于思源本地路径，暂时跳过处理
                // 需要在实际使用时通过主插件类处理
                console.warn('Local image paths need to be handled by main plugin:', url);
                return null;
            } else {
                // 直接获取图片内容
                const response = await fetch(url);
                if (response.ok) {
                    return await response.arrayBuffer();
                }
            }
        } catch (error) {
            console.error('Error getting image content:', error);
        }
        
        return null;
    }
    
    /**
     * 提取 Markdown 中的标题作为默认文件名
     */
    static extractTitleFromMarkdown(markdown: string): string {
        // 匹配一级标题
        const h1Match = markdown.match(/^#\s+(.+)$/m);
        if (h1Match) {
            return this.sanitizeFilename(h1Match[1]);
        }
        
        // 匹配二级标题
        const h2Match = markdown.match(/^##\s+(.+)$/m);
        if (h2Match) {
            return this.sanitizeFilename(h2Match[1]);
        }
        
        // 返回默认文件名
        return `note_${Date.now()}`;
    }
    
    /**
     * 清理文件名（移除非法字符）
     */
    static sanitizeFilename(name: string): string {
        return name
            .replace(/[\\/:*?"<>|]/g, '_') // 移除Windows非法字符
            .replace(/\s+/g, '_')          // 空格替换为下划线
            .replace(/^\.+/, '')           // 移除开头的点
            .substring(0, 100);            // 限制长度
    }
    
    /**
     * 验证笔记选择状态
     */
    static validateNoteSelection(): NoteSelectionState {
        // 这里需要实现获取当前编辑器选择状态的逻辑
        // 暂时返回模拟数据
        return {
            hasSelection: true,
            isSingleNote: true,
            selectedNoteId: '20231101120000-xxxxxxxxx',
            selectedNoteTitle: '示例笔记'
        };
    }
}

export { ContentProcessor };