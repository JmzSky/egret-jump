var __reflect = (this && this.__reflect) || function (p, c, t) {
    p.__class__ = c, t ? t.push(c) : t = [c], p.__types__ = p.__types__ ? t.concat(p.__types__) : t;
};
var __extends = this && this.__extends || function __extends(t, e) { 
 function r() { 
 this.constructor = t;
}
for (var i in e) e.hasOwnProperty(i) && (t[i] = e[i]);
r.prototype = e.prototype, t.prototype = new r();
};
var SceneGame = (function (_super) {
    __extends(SceneGame, _super);
    function SceneGame() {
        var _this = _super.call(this) || this;
        // 方块资源
        _this.blockSourceNames = [];
        // 舞台中的方块数组
        _this.blockArr = [];
        // 下一个的盒子方向（1靠右侧出现，-1靠左侧出现）
        _this.direction = 1;
        // 随机盒子的最大最小水平距离
        _this.minDistance = 220;
        _this.maxDistance = 320;
        // tanθ角度值
        _this.tanAngle = 0.556047197640118;
        // 跳的距离，这里指的是x轴方向的距离
        _this.jumpDistance = 0;
        // 判断是否是按下状态
        _this.isReadyJump = false;
        // 左侧跳跃点
        _this.leftOrigin = { "x": 180, "y": 350 };
        // 右侧跳跃点
        _this.rightOrigin = { "x": 505, "y": 350 };
        // 游戏中得分（数字）
        _this.score = 0;
        // 跳跃距离根据当前按压时间来确定
        _this.time = 0;
        return _this;
    }
    SceneGame.prototype.partAdded = function (partName, instance) {
        _super.prototype.partAdded.call(this, partName, instance);
    };
    SceneGame.prototype.childrenCreated = function () {
        _super.prototype.childrenCreated.call(this);
        this.init();
    };
    SceneGame.prototype.init = function () {
        // 所有盒子资源
        this.blockSourceNames = ["block1_png", "block2_png", "block3_png"];
        // 加载按下和跳跃的声音
        this.pushVoice = RES.getRes('push_mp3');
        this.jumpVoice = RES.getRes('jump_mp3');
        // 初始化场景（方块和小人）
        this.initBlock();
        // 添加触摸事件
        this.blockPanel.touchEnabled = true;
        this.blockPanel.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTapDown, this);
        this.blockPanel.addEventListener(egret.TouchEvent.TOUCH_END, this.onTapUp, this);
        // 心跳计时器（目的：计算按的时长，推算出跳的距离）
        egret.startTick(this.computeDistance, this);
    };
    SceneGame.prototype.computeDistance = function (timeStamp) {
        var now = timeStamp;
        var time = this.time;
        var pass = now - time;
        pass /= 1000;
        if (this.isReadyJump) {
            this.jumpDistance += 300 * pass; // 就是 s = vt，需要注意的是这里算的是横坐标位移而不是斜线位移
        }
        this.time = now;
        return true;
    };
    SceneGame.prototype.onTapDown = function () {
        // 播放按下音效，参数为（从哪里开始播放，播放次数）
        this.pushSoundChannel = this.pushVoice.play(0, 1);
        // 使小人变矮做出积蓄能量的效果
        egret.Tween.get(this.player).to({ scaleY: 0.5 }, 3000);
        this.isReadyJump = true;
    };
    SceneGame.prototype.onTapUp = function () {
        var _this = this;
        if (!this.isReadyJump)
            return;
        if (!this.targetPos)
            this.targetPos = new egret.Point();
        // 一松手小人就该起跳，此时应该禁止点击屏幕，并切换声音
        this.blockPanel.touchEnabled = false;
        this.pushSoundChannel.stop();
        this.jumpVoice.play(0, 1);
        // 清除所有动画
        egret.Tween.removeAllTweens();
        this.isReadyJump = false;
        // 计算落点坐标
        this.targetPos.x = this.player.x + this.direction * this.jumpDistance;
        this.targetPos.y = this.player.y + this.direction * this.jumpDistance * (this.currentBlock.y - this.player.y) / (this.currentBlock.x - this.player.x);
        // 执行跳跃动画
        egret.Tween.get(this).to({ factor: 1 }, 400).call(function () {
            _this.player.scaleY = 1;
            _this.jumpDistance = 0;
            // 判断跳跃是否成功
            _this.checkResult();
        });
        // 执行小人空翻动画，先处理旋转中心点
        this.player.anchorOffsetY = this.player.height / 2;
        egret.Tween.get(this.player)
            .to({ rotation: this.direction > 0 ? 360 : -360 }, 200)
            .call(function () { _this.player.rotation = 0; })
            .call(function () { _this.player.anchorOffsetY = _this.player.height - 20; });
    };
    // 添加一个方块
    SceneGame.prototype.addBlock = function () {
        // 随机一个方块
        var blockNode = this.createBlock();
        // 设置位置
        var distance = this.minDistance + Math.random() * (this.maxDistance - this.minDistance);
        if (this.direction > 0) {
            blockNode.x = this.currentBlock.x + distance;
            blockNode.y = this.currentBlock.y - distance * this.tanAngle;
        }
        else {
            blockNode.x = this.currentBlock.x - distance;
            blockNode.y = this.currentBlock.y - distance * this.tanAngle;
        }
        this.currentBlock = blockNode;
    };
    // 创建一个方块
    SceneGame.prototype.createBlock = function () {
        // 首先实例化一下
        var blockNode = new eui.Image();
        // 使用随机背景图
        var n = Math.floor(Math.random() * this.blockSourceNames.length);
        blockNode.source = this.blockSourceNames[n];
        this.blockPanel.addChildAt(blockNode, 1);
        // 设置方块的锚点（之前说过的不是图片的中心点，而是图中盒子的中心点）
        blockNode.anchorOffsetX = 222;
        blockNode.anchorOffsetY = 78;
        blockNode.touchEnabled = false;
        // 把新创建的方块添加进入 blockArr 里，统一管理
        this.blockArr.push(blockNode);
        return blockNode;
    };
    SceneGame.prototype.checkResult = function () {
        var _this = this;
        //勾股定理
        var err = Math.pow(this.player.x - this.currentBlock.x, 2) + Math.pow(this.player.y - this.currentBlock.y, 2);
        var MAX_ERR_LEN = 90 * 90;
        if (err <= MAX_ERR_LEN) {
            // 更新分数
            this.score++;
            this.scoreLabel.text = this.score.toString();
            // 要跳动的方向
            this.direction = Math.random() > 0.5 ? 1 : -1;
            // 当前方块要移动到相应跳跃点的距离
            var blockX = void 0, blockY = void 0;
            blockX = this.direction > 0 ? this.leftOrigin.x : this.rightOrigin.x;
            blockY = this.stage.stageHeight / 2 + this.currentBlock.height;
            // 小人要移动到的点
            var diffX = this.currentBlock.x - blockX;
            var diffY = this.currentBlock.y - blockY;
            var playerX = void 0, playerY = void 0;
            playerX = this.player.x - diffX;
            playerY = this.player.y - diffY;
            // 更新页面，更新所有方块位置
            this.updateAll(diffX, diffY);
            // 更新小人的位置
            egret.Tween.get(this.player).to({
                x: playerX,
                y: playerY
            }, 800).call(function () {
                // 开始创建下一个方块
                _this.addBlock();
                // 让屏幕重新可点;
                _this.blockPanel.touchEnabled = true;
            });
        }
        else {
            this.restartBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.reset, this);
            this.overPanel.visible = true;
            this.overScoreLabel.text = this.score.toString();
        }
    };
    SceneGame.prototype.updateAll = function (x, y) {
        egret.Tween.removeAllTweens();
        for (var i = this.blockArr.length - 1; i >= 0; i--) {
            var blockNode = this.blockArr[i];
            // 盒子的中心点（不是图片的中心点）在屏幕左侧 或者在 屏幕右侧 或者在 屏幕下方
            if (blockNode.x + blockNode.width - 222 < 0 || blockNode.x - this.stage.stageWidth - 222 > 0 || blockNode.y - this.stage.stageHeight - 78 > 0) {
                // 方块超出屏幕,从显示列表中移除
                if (blockNode)
                    this.blockPanel.removeChild(blockNode);
                this.blockArr.splice(i, 1);
            }
            else {
                // 没有超出屏幕的话,则移动
                egret.Tween.get(blockNode).to({
                    x: blockNode.x - x,
                    y: blockNode.y - y
                }, 800);
            }
        }
    };
    SceneGame.prototype.reset = function () {
        this.score = 0;
        this.scoreLabel.text = this.score.toString();
        // 清空舞台
        this.blockPanel.removeChildren();
        this.blockArr = [];
        // 进行初始化
        this.initBlock();
        this.blockPanel.touchEnabled = true;
        this.overPanel.visible = false;
    };
    SceneGame.prototype.initBlock = function () {
        // 初始化第一个方块
        this.currentBlock = this.createBlock();
        this.currentBlock.x = this.leftOrigin.x;
        this.currentBlock.y = this.stage.stageHeight - this.leftOrigin.y;
        this.blockPanel.addChild(this.currentBlock);
        // 初始化小人
        this.player.y = this.currentBlock.y;
        this.player.x = this.currentBlock.x;
        this.player.anchorOffsetX = this.player.width / 2;
        this.player.anchorOffsetY = this.player.height - 20;
        this.blockPanel.addChild(this.player);
        // 初始化得分
        this.score = 0;
        // 把数字装换成字符串格式
        this.scoreLabel.text = this.score.toString();
        this.blockPanel.addChild(this.scoreLabel);
        // 初始化方向
        this.direction = 1;
        // 添加下一个盒子
        this.addBlock();
    };
    Object.defineProperty(SceneGame.prototype, "factor", {
        // 添加 factor 的 set、get 方法，注意用 public，factor 的初始值为 0
        get: function () {
            return 0;
        },
        // 计算方法参考二次贝塞尔公式：https://blog.csdn.net/korekara88730/article/details/45743339
        // 这里的 getter 使 factor 属性从 0 开始，结合刚才 tween 中传入的 1，使其符合公式中的 t 的取值区间。
        // 而重点是这里的 setter，里面的 player 对象是我们要应用二次贝塞尔曲线的显示对象，而在 setter 中给 player 对象的 xy 属性赋值的公式正是之前列出的二次贝塞尔曲线公式。
        set: function (t) {
            this.player.x = (1 - t) * (1 - t) * this.player.x + 2 * t * (1 - t) * (this.player.x + this.targetPos.x) / 2 + t * t * (this.targetPos.x);
            this.player.y = (1 - t) * (1 - t) * this.player.y + 2 * t * (1 - t) * (this.targetPos.y - 300) + t * t * (this.targetPos.y);
        },
        enumerable: true,
        configurable: true
    });
    return SceneGame;
}(eui.Component));
__reflect(SceneGame.prototype, "SceneGame", ["eui.UIComponent", "egret.DisplayObject"]);
//# sourceMappingURL=SceneGame.js.map