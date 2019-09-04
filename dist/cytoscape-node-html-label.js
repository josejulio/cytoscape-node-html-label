(function () {
    "use strict";
    var $$find = function (arr, predicate) {
        if (typeof predicate !== "function") {
            throw new TypeError("predicate must be a function");
        }
        var length = arr.length >>> 0;
        var thisArg = arguments[1];
        var value;
        for (var i = 0; i < length; i++) {
            value = arr[i];
            if (predicate.call(thisArg, value, i, arr)) {
                return value;
            }
        }
        return undefined;
    };
    var NodeHtmlEventType;
    (function (NodeHtmlEventType) {
        NodeHtmlEventType["CREATE_OR_UPDATE"] = "nodehtml-create-or-update";
        NodeHtmlEventType["DELETE"] = "nodehtml-delete";
    })(NodeHtmlEventType || (NodeHtmlEventType = {}));
    var LabelElement = (function () {
        function LabelElement(_a, params) {
            var node = _a.node, _b = _a.position, position = _b === void 0 ? null : _b, _c = _a.data, data = _c === void 0 ? null : _c;
            this.updateParams(params);
            this._node = node;
            this.initStyles(params.cssClass);
            if (data) {
                this.updateData(data);
            }
            if (position) {
                this.updatePosition(position);
            }
        }
        LabelElement.prototype.updateParams = function (_a) {
            var _b = _a.tpl, tpl = _b === void 0 ? function () { return ""; } : _b, _c = _a.cssClass, cssClass = _c === void 0 ? null : _c, _d = _a.halign, halign = _d === void 0 ? "center" : _d, _e = _a.valign, valign = _e === void 0 ? "center" : _e, _f = _a.halignBox, halignBox = _f === void 0 ? "center" : _f, _g = _a.valignBox, valignBox = _g === void 0 ? "center" : _g;
            var _align = {
                "top": -.5,
                "left": -.5,
                "center": 0,
                "right": .5,
                "bottom": .5
            };
            this._align = [
                _align[halign],
                _align[valign],
                100 * (_align[halignBox] - 0.5),
                100 * (_align[valignBox] - 0.5)
            ];
            this.tpl = tpl;
        };
        LabelElement.prototype.updateData = function (data) {
            try {
                this._node.innerHTML = this.tpl(data);
            }
            catch (err) {
                console.error(err);
            }
        };
        LabelElement.prototype.getNode = function () {
            return this._node;
        };
        LabelElement.prototype.updatePosition = function (pos) {
            this._renderPosition(pos);
        };
        LabelElement.prototype.initStyles = function (cssClass) {
            var stl = this._node.style;
            stl.position = "absolute";
            if (cssClass && cssClass.length) {
                this._node.classList.add(cssClass);
            }
        };
        LabelElement.prototype._renderPosition = function (position) {
            var prev = this._position;
            var x = position.x + this._align[0] * position.w;
            var y = position.y + this._align[1] * position.h;
            if (!prev || prev[0] !== x || prev[1] !== y) {
                this._position = [x, y];
                var valRel = "translate(" + this._align[2] + "%," + this._align[3] + "%) ";
                var valAbs = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px) ";
                var val = valRel + valAbs;
                var stl = this._node.style;
                stl.webkitTransform = val;
                stl.msTransform = val;
                stl.transform = val;
            }
        };
        return LabelElement;
    }());
    var LabelContainer = (function () {
        function LabelContainer(node) {
            this._node = node;
            this._elements = {};
        }
        LabelContainer.prototype.addOrUpdateElem = function (id, param, payload) {
            if (payload === void 0) { payload = {}; }
            var cur = this._elements[id];
            if (cur) {
                cur.updateParams(param);
                cur.updateData(payload.data);
                cur.updatePosition(payload.position);
                return {
                    label: cur,
                    isNew: false
                };
            }
            else {
                var nodeElem = document.createElement("div");
                this._node.appendChild(nodeElem);
                this._elements[id] = new LabelElement({
                    node: nodeElem,
                    data: payload.data,
                    position: payload.position
                }, param);
                return {
                    label: this._elements[id],
                    isNew: true
                };
            }
        };
        LabelContainer.prototype.removeElemById = function (id) {
            if (this._elements[id]) {
                this._node.removeChild(this._elements[id].getNode());
                delete this._elements[id];
                return true;
            }
            return false;
        };
        LabelContainer.prototype.updateElemPosition = function (id, position) {
            var ele = this._elements[id];
            if (ele) {
                ele.updatePosition(position);
            }
        };
        LabelContainer.prototype.updatePanZoom = function (_a) {
            var pan = _a.pan, zoom = _a.zoom;
            var val = "translate(" + pan.x + "px," + pan.y + "px) scale(" + zoom + ")";
            var stl = this._node.style;
            var origin = "top left";
            stl.webkitTransform = val;
            stl.msTransform = val;
            stl.transform = val;
            stl.webkitTransformOrigin = origin;
            stl.msTransformOrigin = origin;
            stl.transformOrigin = origin;
        };
        return LabelContainer;
    }());
    var CytoscapeNodeHtmlLabel = (function () {
        function CytoscapeNodeHtmlLabel(cy, params) {
            var _this = this;
            this.addCyHandler = function (ev) {
                var target = ev.target;
                var param = $$find(_this.params.slice().reverse(), function (x) { return target.is(x.query); });
                if (param) {
                    var nodePosition = _this.getNodePosition(target);
                    var _a = _this.labelContainer.addOrUpdateElem(target.id(), param, {
                        position: nodePosition,
                        data: target.data()
                    }), label = _a.label, isNew = _a.isNew;
                    _this.triggerCreateOrUpdateEvent(target, label, nodePosition, isNew);
                }
            };
            this.layoutstopHandler = function (_a) {
                var cy = _a.cy;
                _this.params.forEach(function (x) {
                    cy.elements(x.query).forEach(function (d) {
                        if (d.isNode()) {
                            _this.labelContainer.updateElemPosition(d.id(), _this.getNodePosition(d));
                        }
                    });
                });
            };
            this.removeCyHandler = function (ev) {
                _this.labelContainer.removeElemById(ev.target.id());
                _this.triggerDeleteEvent(ev.target);
            };
            this.moveCyHandler = function (ev) {
                _this.labelContainer.updateElemPosition(ev.target.id(), _this.getNodePosition(ev.target));
            };
            this.updateDataOrStyleCyHandler = function (ev) {
                if (ev.cy.destroyed()) {
                    return;
                }
                _this.updateNode(ev.target);
            };
            this.createNodesCyHandler = function (_a) {
                var cy = _a.cy;
                _this.params.forEach(function (x) {
                    cy.elements(x.query).forEach(function (d) {
                        if (d.isNode()) {
                            var nodePosition = _this.getNodePosition(d);
                            var _a = _this.labelContainer.addOrUpdateElem(d.id(), x, {
                                position: nodePosition,
                                data: d.data()
                            }), label = _a.label, isNew = _a.isNew;
                            _this.triggerCreateOrUpdateEvent(d, label, nodePosition, isNew);
                        }
                    });
                });
            };
            this.wrapCyHandler = function (_a) {
                var cy = _a.cy;
                _this.labelContainer.updatePanZoom({
                    pan: cy.pan(),
                    zoom: cy.zoom()
                });
            };
            this.params = params;
            this.labelContainer = this.createLabelContainer(cy);
            this.attachEvents(cy);
        }
        CytoscapeNodeHtmlLabel.prototype.updateNodeLabel = function (target) {
            var _this = this;
            target.each(function (ele) {
                _this.updateNode(ele);
            });
        };
        CytoscapeNodeHtmlLabel.prototype.attachEvents = function (cy) {
            var _this = this;
            cy.one("render", function (e) {
                _this.createNodesCyHandler(e);
                _this.wrapCyHandler(e);
            });
            cy.on("add", this.addCyHandler);
            cy.on("layoutstop", this.layoutstopHandler);
            cy.on("remove", this.removeCyHandler);
            cy.on("data", this.updateDataOrStyleCyHandler);
            cy.on("style", this.updateDataOrStyleCyHandler);
            cy.on("pan zoom", this.wrapCyHandler);
            cy.on("position bounds", this.moveCyHandler);
        };
        CytoscapeNodeHtmlLabel.prototype.updateNode = function (node) {
            var param = $$find(this.params.slice().reverse(), function (x) { return node.is(x.query); });
            if (param) {
                var nodePosition = this.getNodePosition(node);
                var _a = this.labelContainer.addOrUpdateElem(node.id(), param, {
                    position: nodePosition,
                    data: node.data()
                }), label = _a.label, isNew = _a.isNew;
                this.triggerCreateOrUpdateEvent(node, label, nodePosition, isNew);
            }
            else {
                this.labelContainer.removeElemById(node.id());
                this.triggerDeleteEvent(node);
            }
        };
        CytoscapeNodeHtmlLabel.prototype.createLabelContainer = function (cy) {
            var _cyContainer = cy.container();
            var _titlesContainer = document.createElement("div");
            var _cyCanvas = _cyContainer.querySelector("canvas");
            var cur = _cyContainer.querySelector("[class^='cy-node-html']");
            if (cur) {
                _cyCanvas.parentNode.removeChild(cur);
            }
            var stl = _titlesContainer.style;
            stl.position = "absolute";
            stl["z-index"] = 10;
            stl.width = "500px";
            stl["pointer-events"] = "all";
            stl.cursor = "default";
            stl.margin = "0px";
            stl.padding = "0px";
            stl.border = "0px";
            stl.outline = "0px";
            stl.outline = "0px";
            _cyCanvas.parentNode.appendChild(_titlesContainer);
            return new LabelContainer(_titlesContainer);
        };
        CytoscapeNodeHtmlLabel.prototype.triggerCreateOrUpdateEvent = function (cytoscapeNode, label, position, isNew) {
            var eventData = {
                label: label,
                position: position,
                isNew: isNew
            };
            cytoscapeNode.trigger(NodeHtmlEventType.CREATE_OR_UPDATE, eventData);
        };
        CytoscapeNodeHtmlLabel.prototype.triggerDeleteEvent = function (cytoscapeNode) {
            cytoscapeNode.trigger(NodeHtmlEventType.DELETE);
        };
        CytoscapeNodeHtmlLabel.prototype.getNodePosition = function (node) {
            return {
                w: node.width(),
                h: node.height(),
                x: node.position("x"),
                y: node.position("y")
            };
        };
        return CytoscapeNodeHtmlLabel;
    }());
    function cyNodeHtmlLabel(_cy, params) {
        var SCRATCHPAD_NAMESPACE_INSTANCE = "cytoscape-node-html-label.instance";
        var instance = _cy.scratch(SCRATCHPAD_NAMESPACE_INSTANCE);
        if (instance) {
            return instance;
        }
        var _params = (!params || typeof params !== "object") ? [] : params;
        instance = new CytoscapeNodeHtmlLabel(_cy, _params);
        _cy.scratch(SCRATCHPAD_NAMESPACE_INSTANCE, instance);
        return instance;
    }
    var register = function (cy) {
        if (!cy) {
            return;
        }
        cy("core", "nodeHtmlLabel", function (optArr) {
            return cyNodeHtmlLabel(this, optArr);
        });
    };
    if (typeof module !== "undefined" && module.exports) {
        module.exports = function (cy) {
            register(cy);
        };
    }
    else {
        if (typeof define !== "undefined" && define.amd) {
            define("cytoscape-nodeHtmlLabel", function () {
                return register;
            });
        }
    }
    if (typeof cytoscape !== "undefined") {
        register(cytoscape);
    }
}());
//# sourceMappingURL=cytoscape-node-html-label.js.map