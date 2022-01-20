
import { Context, Request } from 'koa'
import Config from '@ctsy/config/dist/config'
import { IncomingMessage } from 'http';
import { Session } from '@ctsy/session';
/**
 * 控制器对象
 */
export interface ControllerCtx extends Context {
    config: Config & {}
    req: IncomingMessage & { files: any }
    request: Request & { body: any }
    session: Session
    [index: string]: any
}

export enum GroupType {
    Sum = "Sum",
    Count = "Count",
    Max = "Max",
    Min = "Min",
    Avg = "Avg",
}

export function controller_group_fields(rule: string | string[], type: GroupType, fields: string[]) {
    if ('string' == typeof rule) {
        rule = rule.split(',');
    }
    if (rule.length == 0) {
        return [];
    }
    let rs = [];
    for (let x of rule) {
        if (x.length == 0) {
            continue;
        }
        let s = x.replace(' AS ', ' as ').replace(/`/g, '').split(' as ');
        if (s.length > 0) {
            rs.push(`${type}(\`${s[0]}\`) AS ${s[1]}`)
        } else {
            rs.push(`${type}(\`${s[0]}\`) AS ${s[0]}`)
        }
    }
    return rs;
}

