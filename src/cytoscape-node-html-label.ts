import * as CyTypes from "cytoscape";

type IHAlign = "left" | "center" | "right";
type IVAlign = "top" | "center" | "bottom";
declare var module: any;
declare var define: any;
declare var cytoscape: any;

interface CytoscapeNodeHtmlParams {
  query?: string;
  halign?: IHAlign;
  valign?: IVAlign;
  halignBox?: IHAlign;
  valignBox?: IVAlign;
  cssClass?: string;
  tpl?: (d: any) => string;
}

(function () {
  "use strict";
  const $$find = function <T>(arr: T[], predicate: (a: T) => boolean) {
    if (typeof predicate !== "function") {
      throw new TypeError("predicate must be a function");
    }
    let length = arr.length >>> 0;
    let thisArg = arguments[1];
    let value;

    for (let i = 0; i < length; i++) {
      value = arr[i];
      if (predicate.call(thisArg, value, i, arr)) {
        return value;
      }
    }
    return undefined;
  };

  interface ICyEventObject {
    cy: any;
    type: string;
    target: any;
  }

  interface ICytoscapeNodeHtmlPosition {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  interface IAddOrUpdateElementResponse {
    label: LabelElement;
    isNew: boolean;
  }

  enum NodeHtmlEventType {
    CREATE_OR_UPDATE = "nodehtml-create-or-update",
    DELETE = "nodehtml-delete"
  }

  interface INodeHtmlEventCreateOrUpdate {
    label: LabelElement;
    position: ICytoscapeNodeHtmlPosition;
    isNew: boolean;
  }

  interface ILabelElement {
    data?: any;
    position?: ICytoscapeNodeHtmlPosition;
    node: HTMLElement;
  }

  interface HashTableElements {
    [key: string]: LabelElement;
  }

  class LabelElement {
    public tpl: (d: any) => string;

    private _position: number[];
    private _node: HTMLElement;
    private _align: [number, number, number, number];

    constructor({
                  node,
                  position = null,
                  data = null
                }: ILabelElement,
                params: CytoscapeNodeHtmlParams) {

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

    updateParams({
                   tpl = () => "",
                   cssClass = null,
                   halign = "center",
                   valign = "center",
                   halignBox = "center",
                   valignBox = "center"
                 }: CytoscapeNodeHtmlParams) {

      const _align = {
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
    }

    updateData(data: any) {
      try {
        this._node.innerHTML = this.tpl(data);
      } catch (err) {
        console.error(err);
      }
    }

    getNode(): HTMLElement {
      return this._node;
    }

    updatePosition(pos: ICytoscapeNodeHtmlPosition) {
      this._renderPosition(pos);
    }

    private initStyles(cssClass: string) {
      let stl = this._node.style;
      stl.position = "absolute";
      if (cssClass && cssClass.length) {
        this._node.classList.add(cssClass);
      }
    }

    private _renderPosition(position: ICytoscapeNodeHtmlPosition) {
      const prev = this._position;
      const x = position.x + this._align[0] * position.w;
      const y = position.y + this._align[1] * position.h;

      if (!prev || prev[0] !== x || prev[1] !== y) {
        this._position = [x, y];

        let valRel = `translate(${this._align[2]}%,${this._align[3]}%) `;
        let valAbs = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) `;
        let val = valRel + valAbs;
        let stl = <any>this._node.style;
        stl.webkitTransform = val;
        stl.msTransform = val;
        stl.transform = val;
      }
    }
  }

  /**
   * LabelContainer
   * Html manipulate, find and upgrade nodes
   * it don't know about cy.
   */
  class LabelContainer {
    private _elements: HashTableElements;
    private _node: HTMLElement;

    constructor(node: HTMLElement) {
      this._node = node;
      this._elements = <HashTableElements>{};
    }

    addOrUpdateElem(
        id: string,
        param: CytoscapeNodeHtmlParams,
        payload: { data?: any, position?: ICytoscapeNodeHtmlPosition } = {}
        ): IAddOrUpdateElementResponse {
      let cur = this._elements[id];
      if (cur) {
        cur.updateParams(param);
        cur.updateData(payload.data);
        cur.updatePosition(payload.position);
        return {
          label: cur,
          isNew: false
        };
      } else {
        let nodeElem = document.createElement("div");
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
    }

    removeElemById(id: string) {
      if (this._elements[id]) {
        this._node.removeChild(this._elements[id].getNode());
        delete this._elements[id];
        return true;
      }
      return false;
    }

    updateElemPosition(id: string, position?: ICytoscapeNodeHtmlPosition) {
      let ele = this._elements[id];
      if (ele) {
        ele.updatePosition(position);
      }
    }

    updatePanZoom({pan, zoom}: { pan: { x: number, y: number }, zoom: number }) {
      const val = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
      const stl = <any>this._node.style;
      const origin = "top left";

      stl.webkitTransform = val;
      stl.msTransform = val;
      stl.transform = val;
      stl.webkitTransformOrigin = origin;
      stl.msTransformOrigin = origin;
      stl.transformOrigin = origin;
    }
  }

  class CytoscapeNodeHtmlLabel {
    private labelContainer: LabelContainer;
    private params: CytoscapeNodeHtmlParams[];

    constructor(cy: CyTypes.Core, params: CytoscapeNodeHtmlParams[]) {
      this.params = params;
      this.labelContainer = this.createLabelContainer(cy);
      this.attachEvents(cy);
    }

    public updateNodeLabel(target: CyTypes.NodeCollection) {
      target.each((ele: CyTypes.NodeSingular) => {
        this.updateNode(ele);
      });
    }

    private attachEvents(cy: CyTypes.Core) {
      cy.one("render", (e: any) => {
        this.createNodesCyHandler(e);
        this.wrapCyHandler(e);
      });
      cy.on("add", this.addCyHandler);
      cy.on("layoutstop", this.layoutstopHandler);
      cy.on("remove", this.removeCyHandler);
      cy.on("data", this.updateDataOrStyleCyHandler);
      cy.on("style", this.updateDataOrStyleCyHandler);
      cy.on("pan zoom", this.wrapCyHandler);
      cy.on("position bounds", this.moveCyHandler); // "bounds" - not documented event
    }

    private updateNode(node: CyTypes.NodeSingular) {
      let param = $$find(this.params.slice().reverse(), x => node.is(x.query));
      if (param) {
        const nodePosition = this.getNodePosition(node);
        const { label, isNew } = this.labelContainer.addOrUpdateElem(node.id(), param, {
          position: nodePosition,
          data: node.data()
        });
        this.triggerCreateOrUpdateEvent(node, label, nodePosition, isNew);
      } else {
        this.labelContainer.removeElemById(node.id());
        this.triggerDeleteEvent(node);
      }
    }

    private addCyHandler = (ev: CyTypes.EventObject) => {
      let target = ev.target;
      let param = $$find(this.params.slice().reverse(), x => target.is(x.query));
      if (param) {
        const nodePosition = this.getNodePosition(target);
        const { label, isNew } = this.labelContainer.addOrUpdateElem(target.id(), param, {
          position: nodePosition,
          data: target.data()
        });
        this.triggerCreateOrUpdateEvent(target, label, nodePosition, isNew);
      }
    }

    private layoutstopHandler = ({cy}: CyTypes.EventObject) => {
      this.params.forEach(x => {
        cy.elements(x.query).forEach((d: any) => {
          if (d.isNode()) {
            this.labelContainer.updateElemPosition(d.id(), this.getNodePosition(d));
          }
        });
      });
    }

    private removeCyHandler = (ev: CyTypes.EventObject) => {
      this.labelContainer.removeElemById(ev.target.id());
      this.triggerDeleteEvent(ev.target);
    }

    private moveCyHandler = (ev: CyTypes.EventObject) => {
      this.labelContainer.updateElemPosition(ev.target.id(), this.getNodePosition(ev.target));
    }

    private updateDataOrStyleCyHandler = (ev: CyTypes.EventObject) => {
      if (ev.cy.destroyed()) {
        return;
      }
      this.updateNode(ev.target);
    }

    private createNodesCyHandler = ({cy}: ICyEventObject) => {
      this.params.forEach(x => {
        cy.elements(x.query).forEach((d: any) => {
          if (d.isNode()) {
            const nodePosition = this.getNodePosition(d);
            const { label, isNew } = this.labelContainer.addOrUpdateElem(d.id(), x, {
              position: nodePosition,
              data: d.data()
            });
            this.triggerCreateOrUpdateEvent(d, label, nodePosition, isNew);
          }
        });
      });
    }

    private wrapCyHandler = ({cy}: CyTypes.EventObject) => {
      this.labelContainer.updatePanZoom({
        pan: cy.pan(),
        zoom: cy.zoom()
      });
    }

    private createLabelContainer(cy: CyTypes.Core): LabelContainer {
      let _cyContainer = cy.container();
      let _titlesContainer = document.createElement("div");

      let _cyCanvas = _cyContainer.querySelector("canvas");
      let cur = _cyContainer.querySelector("[class^='cy-node-html']");
      if (cur) {
        _cyCanvas.parentNode.removeChild(cur);
      }

      let stl = _titlesContainer.style;
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
    }

    private triggerCreateOrUpdateEvent(cytoscapeNode: any, label: LabelElement, position: ICytoscapeNodeHtmlPosition, isNew: boolean) {
      const eventData: INodeHtmlEventCreateOrUpdate = {
        label,
        position,
        isNew
      };
      cytoscapeNode.trigger(NodeHtmlEventType.CREATE_OR_UPDATE, eventData);
    }

    private triggerDeleteEvent(cytoscapeNode: any) {
      cytoscapeNode.trigger(NodeHtmlEventType.DELETE);
    }

    private getNodePosition(node: any): ICytoscapeNodeHtmlPosition {
      return {
        w: node.width(),
        h: node.height(),
        x: node.position("x"),
        y: node.position("y")
      };
    }

  }

  function cyNodeHtmlLabel(_cy: any, params: CytoscapeNodeHtmlParams[]): CytoscapeNodeHtmlLabel {

    const SCRATCHPAD_NAMESPACE_INSTANCE = "cytoscape-node-html-label.instance";

    let instance: CytoscapeNodeHtmlLabel = _cy.scratch(SCRATCHPAD_NAMESPACE_INSTANCE);
    if (instance) {
      return instance;
    }

    const _params = (!params || typeof params !== "object") ? [] : params;
    instance = new CytoscapeNodeHtmlLabel(_cy, _params);
    _cy.scratch(SCRATCHPAD_NAMESPACE_INSTANCE, instance);

    return instance;
  }

  // registers the extension on a cytoscape lib ref
  let register = function (cy: any) {

    if (!cy) {
      return;
    } // can't register if cytoscape unspecified

    cy("core", "nodeHtmlLabel", function (optArr: any) {
      return cyNodeHtmlLabel(this, optArr);
    });
  };

  if (typeof module !== "undefined" && module.exports) { // expose as a commonjs module
    module.exports = function (cy: any) {
      register(cy);
    };
  } else {
    if (typeof define !== "undefined" && define.amd) { // expose as an amd/requirejs module
      define("cytoscape-nodeHtmlLabel", function () {
        return register;
      });
    }
  }

  if (typeof cytoscape !== "undefined") { // expose to global cytoscape (i.e. window.cytoscape)
    register(cytoscape);
  }

}());
