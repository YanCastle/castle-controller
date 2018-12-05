
import BaseController from './base_controller';
import Model from 'castle-model';
import Relation from 'castle-relation';
import { uniq, intersection, forOwn } from 'lodash';
export default class Controller extends BaseController {
    async search(post: any) {
        let W = post.W || {},
            Keyword = post.Keyword || '',
            KeywordFields = post.KF || '',
            P = post.P || 1,
            N = post.N || 10,
            Sort = post.Sort || '',
            WPKIDs: any[] = [],
            PKIDs: any[] = [],
            KeywordIDs: any[] = []
        if (Keyword.length > 0) {
            let Where: any = {};
            let Fields: string[] = uniq([...KeywordFields, ...this._KeywordFields])
            if (Fields) {
                Fields.forEach((v: string) => {
                    Where[v] = { like: `%${Keyword.replace(/[ ;%\r\n]/g, '')}%` }
                })
                if (this._KeywordTable) {
                    KeywordIDs = await (new Model(this._ctx, this._KeywordTable)).where({ or: Where }).getFields(this._ctx.config.getDbTablePK(this._ModelName), true)
                }
            }
        }
        if (Object.keys(W).length > 0) {

        }
        let ModelName = this._WTable ? this._WTable : this._ModelName;
        let CurrentModel = new Model(this._ctx, ModelName)
        WPKIDs = await CurrentModel.where(W).order(Sort).getFields(this._ctx.config.getDbTablePK(ModelName), true)
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
            L: PKIDs.length > 0 ? await (new Relation(this._ctx, ModelName)).order(Sort).fields(Object.keys(this._searchFields)).objects(PKIDs) : [],
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
    async saveW(post: any, ctx: any) {
        let W = this.I('W', { type: 'object' });
        if (W)
            return await this._model.where(this.I('W', { type: 'object' })).save(this.I('Params', { type: 'object' }))
        return false;
    }
    async delW(post: any, ctx: any) {
        let W = this.I('W', { type: 'object' });
        if (W)
            return await this._model.where(W).del();
        else
            return false;
    }
    async adds(post: any, ctx: any) {
        if (post instanceof Array)
            return await this._model.addAll(post)
        return false;
    }
    async replaceW(post: any, ctx: any) {
        await this._model.where(this.I('W', { type: 'object', d: { [this._pk]: 0 } })).del()
        return await this._model.addAll(this.I('Data'))
    }
}