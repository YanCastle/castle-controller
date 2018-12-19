import { createReadStream, Stats } from "fs";
import * as fs from 'mz/fs'
import { parse } from "path";
import * as mime from 'mime';
import Relation, { R } from 'castle-relation';
import Model, { M } from 'castle-model';
export default class BaseController {
    public _ctx: any;
    public _config: any
    public _ModelName: string = "";
    public __proto__: any;
    public get _KeywordFields(): Array<string> { return [] };

    public get _KeywordTable(): string { return '' };
    /**
     * search请求时的允许参与搜索的字段配置
     */
    public get _WFields(): string[] { return [] };
    /**
     * 保存数据时的字段过滤
     */
    public get _saveFields(): any {
        return {}
    }
    public get _searchFields(): string[] {
        return this._config.getDbTableFields(this._ModelName)
    }
    public get _WTable(): string { return '' };
    protected get _pk(): string {
        return this._ctx.config.getDbTablePK(this._ModelName)
    }
    public get _model(): any {
        if (this._ctx.config.getDbDefine(this._ModelName))
            return new Model(this._ctx, this._ModelName);
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
    protected async _session(name: string, value?: any): Promise<any> {
        try {
            if ('undefined' == typeof value) {
                return await this._ctx.session.get(name)
            } else if (name === null) {
                await this._ctx.session.destory()
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
            this._ctx.set('Content-Type', mime.getType(ext ? ext : parse(file).ext.substr(1)))
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
    protected M(TableName?: string): Model {
        let modal = M(this._ctx, TableName ? TableName : this._ModelName);
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
    protected R(RelationName: string): Relation {
        return R(this._ctx, RelationName ? RelationName : this._ModelName)
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
}