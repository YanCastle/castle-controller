import { createReadStream, Stats } from "fs";
import * as fs from 'mz/fs'
import { parse } from "path";
import * as mime from 'mime';
import Relation, { R } from '@ctsy/relation';
import Model, { M } from '@ctsy/model';
import { ControllerCtx } from "./utils";
import Config from '@ctsy/config/dist/config'
import { get } from "lodash";
export default class BaseController {
    /**
     * 由路由注入的控制器对象
     */
    public _ctx: ControllerCtx;
    /**
     * 配置对象
     * @link https://www.npmjs.com/package/@ctsy/config
     */
    public _config: Config
    /**
     * 可以手动指定的模型名称
     */
    public _ModelName: string = "";
    public __proto__: any;
    /**
     * 数据库前缀配置
     */
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
    /**
     * 查询的字段范围
     */
    public get _searchFields() {
        return this._config.getDbTableFields(this._ModelName)
    }
    /**
     * 数据库的主键
     */
    protected get _pk(): string {
        return this._ctx.config.getDbTablePK(this._ModelName)
    }
    /**
     * 获取当前控制器下的绑定模型
     */
    public get _model(): any {
        if (this._ctx.config.getDbDefine(this._ModelName))
            return new Model(this._ctx, this._ModelName, this._prefix);
    }
    /**
     * 初始化控制器
     * @param ctx 
     */
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
     * @example
     * this._sendContent("文件内容","filename.txt")
     */
    protected _sendContent(content: any, filename: string): void {
        this._ctx.attachment(filename)
        this._ctx.config.sendFile = true;
        this._ctx.body = content
    }
    /**
     * cookie操作
     * @param name cookie名称
     * @param value cookie值，如果存在则是设置值
     * @param options 设置参数
     * @example
     * //读取cookie
     * let uk = await this._cookie("uk")
     * @example
     * //设置cookie
     * await this._cookie("uk",1)
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
     * @example
     * //取值
     * let User = awiat this._session("User")
     * @example
     * //设置
     * await this._session("User",{UID:1})
     * @description
     * 进行session的读写操作
     */
    protected async _session(name: string, value?: any): Promise<string | { [index: string]: any } | void> {
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
     * @param path 要发送的文件在本地的相对路径或者是绝对路径
     * 
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
    /**
     * 当前请求上传的文件
     */
    get _files(): { [index: string]: any } {
        if (this._ctx.req.files) {
            return this._ctx.req.files
        }
        throw new Error('NO_UPLOAD_FILES')
    }
    /**
     * 实例化一个数据库操作对象
     * @param TableName 
     * @description
     * 提供类似于ThinkPHP3.2的ORM模型，底层使用Sequelize
     * @example 查询
     * this.M("Model").where({UID:{gt:1}}).select()
     * @example 添加
     * this.M("Model").add({ UID: 6, Sex: 1 });
     * @link https://www.npmjs.com/package/@ctsy/model
     * @returns {Model} 数据库模型
     */
    protected M(TableName?: string): Model {
        let modal = M(this._ctx, TableName ? TableName : this._ModelName, this._prefix);
        if (this.trans) { modal.setTrans(this.trans) }
        return modal;
    }
    trans: any;
    /**
     * 开启事务
     * @description
     * 支持嵌套事务，
     * @example
     * await this.startTrans()
     * try{
     *  //数据库逻辑处理
     *  await this.commit()
     * } catch(e){
     *  await this.rollback()
     *  throw e;
     * }
     */
    protected async startTrans() {
        return this.trans = await this._ctx.config.startTrans()
    }
    /**
     * 提交数据库事务
     * @description
     * 提交本次事务，若存在嵌套事务，嵌套多少次就需要提交多少次
     * @example
     * await this.startTrans()
     * try{
     *  //数据库逻辑处理
     *  await this.commit()
     * } catch(e){
     *  await this.rollback()
     *  throw e;
     * }
     */
    protected async commit() {
        return await this._ctx.config.commit()
    }
    /**
     * 撤销数据库事务
     * @description
     * 撤销事务，不管嵌套多少次，只需要撤销一次就会全部生效
     * @example
     * await this.startTrans()
     * try{
     *  //数据库逻辑处理
     *  await this.commit()
     * } catch(e){
     *  await this.rollback()
     *  throw e;
     * }
     */
    protected async rollback() {
        return await this._ctx.config.rollback()
    }
    /**
     * 实例化关系对象
     * @param RelationName 
     * @description
     * 提供基于关系对象的查询操作
     * @example
     * this.R("Model").where({UID:{gt:1}}).select()
     */
    protected R(RelationName: string): Relation {
        return R(this._ctx, RelationName ? RelationName : this._ModelName, this._prefix)
    }
    /**
     * 取参数，支持
     * @param name 
     * @param options 可选项
     * @param options.type 数据类型过滤
     * @param options.default 默认值  
     * @example 基础参数
     * POST数据：{P:1,N:2,W:{UID:1}}
     * let P = this.I("P"),N=this.I("N"),UID=this.I("W.UID")
     * @example 参数过滤，请求同上面POST数据
     *  //UID=1
     * let UID = this.I("W.UID",{type:'number',d:0})
     * //抛出错误，找不到符合类型的数据
     * let UID = this.I("W.UID",{type:'string',d:0}) 
     * @returns 
     */
    protected I(name: string, options?: { type?: string | Function | Symbol, d?: any }) {
        let data = get(this._ctx.request.body, name, options ? options.d : '')
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
    /**
     * 计划的服务端模板渲染处理
     * @param file 
     * @param data 
     */
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