import { createReadStream, Stats } from "fs";
import * as fs from 'mz/fs'
import { parse } from "path";
import * as mime from 'mime';
import Relation, { R } from '@ctsy/relation';
import Model, { M } from '@ctsy/model';
import { ControllerCtx } from "./utils";
export default class BaseController {
    public _ctx: ControllerCtx;
    public _config: any
    public _ModelName: string = "";
    public __proto__: any;
    public _prefix: string = ""

    public _render: boolean | string = false;
    /**
     * 应用编号，saas模式下可用
     */
    public appid: string = "";
    /**
     * 模糊查询字段定义，
     */
    public get _KeywordFields(): Array<string> { return [] };
    /**
     * 模糊查询表，必须定义后模糊查询的Keyword才生效
     */
    public get _KeywordTable(): string { return '' };
    /**
     * search请求时的允许参与搜索的字段配置
     */
    public get _WFields(): string[] { return [] };
    public get _WTable(): string { return '' };
    /**
     * 保存数据时的字段过滤
     */
    public get _saveFields(): any {
        return {}
    }
    public get _searchFields(): string[] {
        return this._config.getDbTableFields(this._ModelName)
    }
    protected get _pk(): string {
        return this._ctx.config.getDbTablePK(this._ModelName)
    }
    public get _model(): any {
        if (this._ctx.config.getDbDefine(this._ModelName))
            return new Model(this._ctx, this._ModelName, this._prefix);
    }
    constructor(ctx: any) {
        this._ctx = ctx;
        this._config = ctx.config;
        this._ModelName = this.__proto__.constructor.name;
    }

    protected async _checkPermission(): Promise<boolean> {
        return true;
    }

    /**
     * 发送下载文件，
     * @param path 文件路径
     * @param filename 文件名称
     */
    protected async _send(path: string, filename: string) {
        this._ctx.attachment(filename)
        this._ctx.config.sendFile = true;
        this._ctx.body = createReadStream(path)
    }
    /**
     * 发送下载文件
     * @param content 文件内容 
     * @param filename 文件名称
     */
    protected _sendContent(content: any, filename: string): void {
        this._ctx.attachment(filename)
        this._ctx.config.sendFile = true;
        this._ctx.body = content
    }
    /**
     * cookie操作
     * @param name 
     * @param value 
     * @param options 
     */
    protected _cookie(name: string, value?: string, options?: Object) {
        if ('undefined' == typeof value) {
            try {
                return this._ctx.cookies.get(name)
            } catch (e) {
                return '';
            }
        } else {
            this._ctx.cookies.set(name, value, options ? options : {})
        }
    }
    /**
     * session读写操作
     * @param {string} name session名称
     * @param {any|undefined} value 若值不为空则为设置，若值为undefined表示取值，若为null表示清空
     */
    protected async _session(name: string, value?: any): Promise<any> {
        try {
            if (name === null) {
                return await this._ctx.session.destory()
            }
            if (this.appid) {
                name = this.appid + '/' + name
            } else
                if (this._ctx.auth) {
                    name = (this._ctx.auth.appid || 'unknow') + '/' + name
                }
            if ('undefined' == typeof value) {
                return await this._ctx.session.get(name)
            } else {
                await this._ctx.session.set(name, value)
            }
        } catch (e) {
            return '';
        }
    }
    /**
     * Web服务中的发送数据
     * @param path 
     */
    protected async _sendFile(file: string, ext: string = '', config: {} = {}) {
        if (await fs.exists(file)) {
            // let info = path.parse(file)
            let stat: Stats | any = await fs.stat(file)
            this._ctx.set('Content-Type', mime.getType(ext ? ext : parse(file).ext.substr(1)) || '')
            this._ctx.set('Content-Length', stat.size)
            this._ctx.set('Last-Modified', stat.mtimeMs)
            this._ctx.set('Cache-Control', 'public')
            this._ctx.body = createReadStream(file)
        }
    }
    get _files(): { [index: string]: any } {
        if (this._ctx.req.files) {
            return this._ctx.req.files
        }
        throw new Error('NO_UPLOAD_FILES')
    }
    /**
     * 实例化一个数据库操作对象
     * @param TableName 
     */
    protected M(TableName?: string): Model {
        let modal = M(this._ctx, TableName ? TableName : this._ModelName, this._prefix);
        if (this.trans) { modal.setTrans(this.trans) }
        return modal;
    }
    trans: any;
    /**
     * 开启事务
     */
    protected async startTrans() {
        this.trans = await this._ctx.config.startTrans()
        return this.trans;
    }
    /**
     * 提交数据库事务
     */
    protected async commit() {
        return await this._ctx.config.commit()
    }
    /**
     * 撤销数据库事务
     */
    protected async rollback() {
        return await this._ctx.config.rollback()
    }
    /**
     * 实例化关系对象
     * @param RelationName 
     */
    protected R(RelationName: string): Relation {
        return R(this._ctx, RelationName ? RelationName : this._ModelName, this._prefix)
    }
    protected I(name: string, options?: Object | any) {
        let data = 'undefined' !== typeof this._ctx.request.body[name] ? this._ctx.request.body[name] : (options ? options.d : undefined);
        if (!options) { return data }
        if (options.type instanceof String) {
            if (options.type == typeof data) {
                return data;
            } else {
                throw new Error('CAN_NOT_FOUND_' + name)
            }
        } else if (options.type instanceof Function) {
            if (options.type(data)) { return data } else { throw new Error(`PARAM_${name}_TYPE_ERROR`) }
        } else if (options.type instanceof Symbol) {
            return data;
        }
        else {
            return data;
        }
    }
    async render(file: string = "", data: Object) {
        let ejs = require('ejs');
        if (ejs) {
            try {

            } catch (error) {

            }
        } else {
            console.error('缺少ejs库，请使用 yarn add ejs 安装')
        }
    }
}