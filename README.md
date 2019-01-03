# castle-server框架 控制器基础库
```typescript
// 基础控制器
// 提供 this._session,this._cookie,this.M,this.R基础操作
import {BaseController} from 'castle-controller'
export default class cc extends BaseController{

}

// 支持CURD操作的控制器
//提供 get/save/add/adds/saveW/search/del/delW/replaceW方法
import {Controller} from "castle-controller"
export default class cc extends Controller{

}
```