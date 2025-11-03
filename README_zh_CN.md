# 思源笔记 GitHub 发布插件

[English](./README.md)

## 1. 项目介绍

一个强大的思源笔记插件，允许您将笔记发布到 GitHub 仓库。笔记和图片存储在同一个目录中，非常适合 GitHub Pages 博客或文档网站。

### ✨ 功能特性

- **一键发布**: 点击即可将笔记发布到 GitHub
- **图片处理**: 自动处理并上传图片到与笔记相同的目录
- **同目录存储**: 笔记和图片存储在一起，便于管理
- **Front Matter 支持**: 支持自定义 YAML 格式的元数据
- **自定义域名**: 支持 GitHub Pages 自定义域名
- **发布历史**: 跟踪和管理已发布的笔记
- **连接测试**: 内置 GitHub 连接验证功能
- **多语言支持**: 中文和英文界面

## 2. 配置说明

### GitHub 设置

在发布之前，需要在插件设置面板中配置 GitHub 设置：

1. **GitHub 用户名**: 您的 GitHub 用户名
2. **Access Token**: GitHub Personal Access Token（需要 `repo` 权限）
   - 创建地址: https://github.com/settings/tokens
3. **仓库地址**: 格式: `用户名/仓库名`
4. **分支名称**: 默认: `main`
5. **基础路径**: 存储路径（例如: `content/posts`）
6. **自定义域名**: 您的 GitHub Pages 自定义域名（可选）
7. **Front Matter**: YAML 格式的元数据模板（可选）

### Front Matter 模板

在 Front Matter 模板中使用占位符：
- `<TITLE>`: 替换为笔记标题
- `<DATE>`: 替换为当前日期（YYYY-MM-DD）

示例：
```yaml
---
title: <TITLE>
date: <DATE>
author: 您的姓名
categories:
  - 笔记
---
```

## 3. 使用方法

### 发布笔记

1. 在思源中打开要发布的笔记
2. 点击顶部工具栏的 GitHub 图标
3. 选择"发布当前笔记"
4. 输入上传目录名称
5. 查看 Front Matter（如果已配置）
6. 点击"发布"

### 管理已发布的笔记

- **查看已发布笔记**: 点击 GitHub 图标查看发布历史
- **在 GitHub 中打开**: 点击 markdown URL 在浏览器中打开
- **删除发布内容**: 使用"删除发布"选项从 GitHub 移除

## 4. 文件结构

发布后，每个笔记会创建如下的目录结构：
```
content/posts/
└── 笔记标题/
    ├── index.md          # 笔记内容
    ├── image1.png        # 嵌入的图片
    ├── image2.jpg        # 嵌入的图片
    └── ...               # 其他资源文件
```

所有文件都存储在同一个目录中，便于管理，非常适合静态网站生成器如 Jekyll、Hugo 或 GitHub Pages。

## 5. 开发指南

### 前置要求

- [Node.js](https://nodejs.org/) (v16 或更高版本)
- [pnpm](https://pnpm.io/) 包管理器
- 思源笔记 v3.2.1 或更高版本

### 从源代码构建

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourname/siyuan-github-publish-plugin.git
   cd siyuan-github-publish-plugin
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **创建到思源插件目录的符号链接**
   ```bash
   pnpm run make-link
   ```

4. **启动开发模式**
   ```bash
   pnpm run dev
   ```

5. **在思源中启用插件**
   - 打开思源笔记
   - 进入设置 → 社区集市 → 已下载
   - 启用 "GitHub 发布插件"

### 项目结构

```
src/
├── index.ts          # 主插件类
├── libs/
│   ├── github-api.ts # GitHub API 封装
│   ├── settings.ts   # 设置管理
│   ├── content-processor.ts # Markdown 内容处理
│   └── dialog.ts     # 对话框工具
├── types/
│   └── github.d.ts   # TypeScript 类型定义
└── index.scss        # 样式文件
```

### 构建命令

```bash
# 开发模式（热重载）
pnpm run dev

# 生产构建
pnpm run build

# 创建符号链接
pnpm run make-link

# 创建安装包
pnpm run make-install

# 更新版本
pnpm run update-version
```

## 6. 常见问题

### 常见问题

1. **认证失败**
   - 确保 GitHub Access Token 有 `repo` 权限
   - 检查 token 是否已过期

2. **仓库不存在**
   - 验证仓库格式: `用户名/仓库名`
   - 确保您有仓库的写入权限

3. **分支不存在**
   - 检查分支是否存在于您的仓库中
   - 默认分支通常是 `main` 或 `master`

4. **图片上传失败**
   - 检查网络连接
   - 验证仓库权限

**注意**: 本插件需要具有仓库写入权限的 GitHub Personal Access Token。请勿公开分享您的 token。
