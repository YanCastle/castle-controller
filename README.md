# castle-server框架 控制器基础库
```typescript
// 基础控制器
// 提供 this._session,this._cookie,this.M,this.R基础操作
import {BaseController} from 'castle-controller'
export default class cc extends BaseController{

}

import Relation from 'castle-relation';
import Model from 'castle-model';
export default class BaseController {
    _ctx: any;
    _config: any;
    _ModelName: string;
    __proto__: any;
    readonly _KeywordFields: Array<string>;
    readonly _KeywordTable: string;
    /**
     * search请求时的允许参与搜索的字段配置
     */
    readonly _WFields: string[];
    /**
     * 保存数据时的字段过滤
     */
    readonly _saveFields: any;
    readonly _searchFields: string[];
    readonly _WTable: string;
    protected readonly _pk: string;
    readonly _model: any;
    constructor(ctx: any);
    protected _checkPermission(): Promise<boolean>;
    /**
     * 发送下载文件，
     * @param path 文件路径
     * @param filename 文件名称
     */
    protected _send(path: string, filename: string): Promise<void>;
    /**
     * 发送下载文件
     * @param content 文件内容
     * @param filename 文件名称
     */
    protected _sendContent(content: any, filename: string): void;
    protected _cookie(name: string, value?: string, options?: Object): any;
    protected _session(name: string, value?: any): Promise<any>;
    /**
     * Web服务中的发送数据
     * @param path
     */
    protected _sendFile(file: string, ext?: string, config?: {}): Promise<void>;
    readonly _files: {
        [index: string]: any;
    };
    protected M(TableName?: string): Model;
    trans: any;
    /**
     * 开启事务
     */
    protected startTrans(): Promise<any>;
    /**
     * 提交数据库事务
     */
    protected commit(): Promise<any>;
    /**
     * 撤销数据库事务
     */
    protected rollback(): Promise<any>;
    protected R(RelationName: string): Promise<Relation>;
    protected I(name: string, options?: Object | any): any;
}


// 支持CURD操作的控制器
//提供 get/save/add/adds/saveW/search/del/delW/replaceW方法
import {Controller} from "castle-controller"
export default class cc extends Controller{

}


import BaseController from './base_controller';
export default class Controller extends BaseController {
    /**
     * 查询请求
     * @param post
     */
    search(post: any): Promise<{
        L: any;
        T: number;
        P: any;
        N: any;
        R: {};
    }>;
    /**
     * 获取单个
     * @param post
     * @param ctx
     */
    get(post: any, ctx: any): Promise<any>;
    /**
     * 添加
     * @param post
     * @param ctx
     */
    add(post: any, ctx: any): Promise<any>;
    /**
     * 删除
     * @param post
     * @param ctx
     */
    del(post: any, ctx: any): Promise<any>;
    /**
     * 更新
     * @param post
     * @param ctx
     */
    save(post: any, ctx: any): Promise<any>;
    /**
     * 条件更新
     * @param post
     * @param ctx
     */
    saveW(post: any, ctx: any): Promise<any>;
    /**
     * 条件删除
     * @param post
     * @param ctx
     */
    delW(post: any, ctx: any): Promise<any>;
    /**
     * 批量添加
     * @param post
     * @param ctx
     */
    adds(post: any, ctx: any): Promise<any>;
    /**
     * 批量替换
     * @param post
     * @param ctx
     */
    replaceW(post: any, ctx: any): Promise<any>;
}

```

# 开始支持ejs渲染，
## 在模块或根路径下创建view目录，