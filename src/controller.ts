
import BaseController from './base_controller';
import { uniq, intersection, forOwn } from 'lodash';
import { array_columns } from 'castle-function';
import { DbOp, M } from '@ctsy/model';
import { GroupType, controller_group_fields } from './utils';

export default class Controller extends BaseController {
    /**
     * 分组统计
     * @param d 
     */
    async group(d: { Group: string, Sum: string, Count: string, Max: string, Min: string, Avg: string, W: { [index: string]: any } }[]) {
        let db = Object.keys(await this._ctx.config.getDbTableFields(this._WTable ? this._WTable : this._ModelName))
        return await Promise.all(
            d.map(async (v) => {
                let sql = await this.M().fields(this._pk).group(v.Group).where(v.W).sql(true).select()
                let fields: string[] = [];
                if (v.Sum) {
                    fields.push(...controller_group_fields(v.Sum, GroupType.Sum, db))
                    // v.Sum.split(',').map((o) => {
                    //     let s = `SUM(\`${o}\`) AS \`${o}\``;
                    //     if (fields.includes(s))
                    //         fields.push(s)
                    // })
                }
                if (v.Count) {
                    fields.push(...controller_group_fields(v.Count, GroupType.Count, db))
                    // v.Count.split(',').map((o) => {
                    //     let s = `COUNT(\`${o}\`) AS \`${o}\``;
                    //     if (fields.includes(s))
                    //         fields.push(s)
                    // })
                }
                if (v.Max) {
                    fields.push(...controller_group_fields(v.Max, GroupType.Max, db))
                    // v.Max.split(',').map((o) => {
                    //     let s = `MAX(\`${o}\`) AS \`${o}\``;
                    //     if (fields.includes(s))
                    //         fields.push(s)
                    // })
                }
                if (v.Min) {
                    fields.push(...controller_group_fields(v.Min, GroupType.Min, db))
                    // v.Min.split(',').map((o) => {
                    //     let s = `MIN(\`${o}\`) AS \`${o}\``;
                    //     if (fields.includes(s))
                    //         fields.push(s)
                    // })
                }
                if (v.Avg) {
                    fields.push(...controller_group_fields(v.Avg, GroupType.Avg, db))
                    // v.Avg.split(',').map((o) => {
                    //     let s = `AVG(\`${o}\`) AS \`${o}\``;
                    //     if (fields.includes(s))
                    //         fields.push(s)
                    // })
                }
                return this.M().query(`SELECT \`${this._pk}\`,${fields.join(',')} FROM ${this._prefix}${this._WTable ? this._WTable : this._ModelName} WHERE ${sql} GROUP BY :Group`,
                    {
                        replacements: {
                            Group: v.Group
                        }
                    })
            })
        )
    }
    /**
     * 查询请求
     * @param post 
     */
    async search(post: any) {
        let ModelName = this._WTable ? this._WTable : this._ModelName;
        let W: any = post.W || {},
            Keyword = post.Keyword || '',
            KeywordFields = post.KF || [],
            P = parseInt(post.P || 1),
            N = parseInt(post.N || 10),
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
                    Where[DbOp.or][v] = { [DbOp.like]: `%${Keyword.replace(/[ ;%\r\n]/g, '')}%` }
                })
                // if (this._KeywordTable) {
                //     KeywordIDs = await (M(this._ctx, this._KeywordTable, this._prefix)).where({ or: Where }).getFields(this._ctx.config.getDbTablePK(this._ModelName), true)
                // }
            }
        }
        let CurrentModel = M(this._ctx, ModelName, this._prefix);
        if (Keyword.length == 0 || this._ModelName.toLowerCase() == this._KeywordTable.toLowerCase()) {
            let whereStr: any = await CurrentModel.sql(true).where(Object.assign(W, Where)).fields(PK).select();
            let sql: string[] = [`SELECT ${PK} FROM ${CurrentModel.true_table_name}`];
            if (whereStr.length > 0) {
                sql.push(`WHERE ${whereStr}`)
            }
            let countSQL = sql.join(' ').replace(` ${PK} `, ` COUNT(${PK}) AS A `);
            if (Sort) {
                sql.push(`ORDER BY ${Sort}`)
            }
            sql.push(`LIMIT ${(P - 1) * N},${N}`);
            let rsql = sql.join(' ');
            let [PKIDs, Count] = await Promise.all([
                CurrentModel.query(rsql),
                CurrentModel.query(countSQL)
            ]);
            return {
                L: PKIDs.length > 0 ? await (this.R(ModelName)).order(Sort).fields(Object.keys(this._searchFields)).objects(<any>array_columns(PKIDs, PK)) : [],
                T: Count[0].A,
                P, N, R: {}
            }
        } else {
            if (this._KeywordTable) {
                KeywordIDs = (await this.R(this._KeywordTable).where({ or: Where }).fields([PK]).select()).map((v: any) => { return v[PK] })
            }
        }
        if (KeywordIDs.length > 0) {
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
        } else {
            let rs: any = await (this.R(ModelName)).where(W).page(P, N).order(Sort).fields(Object.keys(this._searchFields)).selectAndCount()
            return {
                L: rs.rows,
                T: rs.count,
                P, N, R: {}
            }
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