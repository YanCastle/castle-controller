
import BaseController from './base_controller';
import Model, { M } from '@ctsy/model';
import { uniq, intersection, forOwn } from 'lodash';
import { array_columns } from 'castle-function';
import { DbOp } from '@ctsy/model/dist/index';
import { R } from '@ctsy/relation';
export default class Controller extends BaseController {

    /**
     * 查询请求
     * @param post 
     */
    async search(post: any) {
        let ModelName = this._WTable ? this._WTable : this._ModelName;
        let W: any = post.W || {},
            Keyword = post.Keyword || '',
            KeywordFields = post.KF || [],
            P = post.P || 1,
            N = post.N || 10,
            Sort = post.Sort || '',
            WPKIDs: any[] = [],
            PKIDs: any[] = [],
            KeywordIDs: any[] = [],
            TableFields: { [index: string]: any } = await this._ctx.config.getDbTableFields(ModelName),
            PK = this._ctx.config.getDbTablePK(ModelName),
            Where: any = {};
        if (Sort) {
            if ('string' == typeof Sort) {
                for (let x of Sort.split(',')) {
                    let key = x.split(' ');
                    if (!TableFields[key[0]]) {
                        throw new Error(`Sort Field:${key[0]} Is Not Avaliable`);
                    }
                    if (key[1] && !['asc', 'desc'].includes(key[1].toLowerCase())) {
                        throw new Error(`Sort Field:${key[0]} Sort Type ${key[1]} Is Not Avaliable`)
                    }
                }
            }
        }
        if (Keyword.length > 0) {
            // let Where: any = {};
            Where[DbOp.or] = {}
            let Fields: string[] = KeywordFields ? intersection([...KeywordFields, ...this._KeywordFields]) : this._KeywordFields
            if (Fields && this._KeywordTable) {
                Fields.forEach((v: string) => {
                    Where[DbOp.or][v] = { like: `%${Keyword.replace(/[ ;%\r\n]/g, '')}%` }
                })
                // if (this._KeywordTable) {
                //     KeywordIDs = await (M(this._ctx, this._KeywordTable, this._prefix)).where({ or: Where }).getFields(this._ctx.config.getDbTablePK(this._ModelName), true)
                // }
            }
        }
        let CurrentModel = M(this._ctx, ModelName, this._prefix);
        if (Keyword.length == 0 || this._ModelName.toLowerCase() == this._KeywordTable.toLowerCase()) {
            let whereStr: string = await CurrentModel.sql(true).where(Object.assign(W, Where)).fields(PK).select();
            let sql: string[] = [`SELECT ${PK} FROM ${CurrentModel.true_table_name}`];
            if (whereStr.length > 0) {
                sql.push(`WHERE ${whereStr}`)
            }
            let countSQL = sql.join(' ').replace(` ${PK} `, ` COUNT(${PK}) AS A `);
            if (Sort) {
                sql.push(`ORDER BY ${Sort}`)
            }
            sql.push(`LIMIT ${(P - 1) * N},${P * N}`);
            let rsql = sql.join(' ');
            let [PKIDs, Count] = await Promise.all([
                CurrentModel.query(rsql),
                CurrentModel.query(countSQL)
            ]);
            return {
                L: PKIDs.length > 0 ? await (this.R(ModelName)).order(Sort).fields(Object.keys(this._searchFields)).objects(array_columns(PKIDs, PK)) : [],
                T: Count[0].A,
                P, N, R: {}
            }
        } else {
            if (this._KeywordTable) {
                KeywordIDs = await (R(this._ctx, this._KeywordTable, this._prefix)).where({ or: Where }).getFields(PK, true)
            }
        }
        WPKIDs = await CurrentModel.where(W).order(Sort).getFields(PK, true)
        if (Keyword) {
            //当且仅当Keyword不为空的时候才做查询结果合并
            PKIDs = intersection(WPKIDs, KeywordIDs)
        } else {
            PKIDs = WPKIDs;
        }
        let T = PKIDs.length;
        if (PKIDs.length > (P - 1) * N) {
            PKIDs = PKIDs.slice((P - 1) * N, P * N)
        } else {
            PKIDs = [];
        }
        return {
            L: PKIDs.length > 0 ? await (this.R(ModelName)).order(Sort).fields(Object.keys(this._searchFields)).objects(PKIDs) : [],
            T,
            P, N, R: {}
        }
    }
    /**
     * 获取单个
     * @param post 
     * @param ctx 
     */
    async get(post: any, ctx: any) {
        return await this._model.where({ [this._ctx.config.getDbTablePK(this._ModelName)]: post[this._ctx.config.getDbTablePK(this._ModelName)] || 0 }).find()
    }
    /**
     * 添加
     * @param post 
     * @param ctx 
     */
    async add(post: any, ctx: any) {
        return await this._model.add(post)
    }
    /**
     * 删除
     * @param post 
     * @param ctx 
     */
    async del(post: any, ctx: any) {
        return await this._model.where({ [this._ctx.config.getDbTablePK(this._ModelName)]: post[this._ctx.config.getDbTablePK(this._ModelName)] || 0 }).del();
    }
    /**
     * 更新
     * @param post 
     * @param ctx 
     */
    async save(post: any, ctx: any) {
        return await this._model
            .where({ [this._ctx.config.getDbTablePK(this._ModelName)]: post[this._ctx.config.getDbTablePK(this._ModelName)] || 0 })
            .save(this.I('Params', {
                type: (data: any) => {
                    //TODO 循环处理判定数据是否合法及函数过滤
                    forOwn(this._saveFields, (v: any, k: string) => {
                        if (v instanceof Function) {
                            v(k, data)
                        } else {

                        }
                    })
                    return true;
                }
            }))
    }
    /**
     * 条件更新
     * @param post 
     * @param ctx 
     */
    async saveW(post: any, ctx: any) {
        let W = this.I('W', { type: 'object' });
        if (W)
            return await this._model.where(this.I('W', { type: 'object' })).save(this.I('Params', { type: 'object' }))
        return false;
    }
    /**
     * 条件删除
     * @param post 
     * @param ctx 
     */
    async delW(post: any, ctx: any) {
        let W = this.I('W', { type: 'object' });
        if (W)
            return await this._model.where(W).del();
        else
            return false;
    }
    /**
     * 批量添加
     * @param post 
     * @param ctx 
     */
    async adds(post: any, ctx: any) {
        if (post instanceof Array)
            return await this._model.addAll(post)
        return false;
    }
    /**
     * 批量替换
     * @param post 
     * @param ctx 
     */
    async replaceW(post: any, ctx: any) {
        await this._model.where(this.I('W', { type: 'object', d: { [this._pk]: 0 } })).del()
        return await this._model.addAll(this.I('Data'))
    }
}