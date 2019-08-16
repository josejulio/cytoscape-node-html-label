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
  tplUpdated?: (cyNode: any, htmlNode: any) => void;
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
    public tplUpdated: (_1: any, _2: any) => void;

    public _position: number[];
    public _node: HTMLElement;
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
                   tplUpdated = (_1, _2) => undefined,
                   cssClass = null,
                   halign = "center",
                   valign = "center",
                   halignBox = "center",
                   valignBox = "center",
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
      this.tplUpdated = tplUpdated;
    }

    updateData(data: any) {
      try {
        const html = this.tpl(data);
        if (this._node.innerHTML !== html) {
          this._node.innerHTML = html;
          return true;
        }
      } catch (err) {
        console.error(err);
      }
      return false;
    }

    getNode(): HTMLElement {
      return this._node;
    }

    updatePosition(pos: ICytoscapeNodeHtmlPosition) {
      this._renderPosition(pos);
    }

    private initStyles(cssClass: string) {
      let stl = this._node.style;
      stl.position = 'absolute';
      if (cssClass && cssClass.length) {
        this._node.classList.add(cssClass);
      }
    }

    private _renderPosition(position: ICytoscapeNodeHtmlPosition) {
      const prev = this._position;
      const x = position.x + this._align[0] * position.w;
      const y = position.y + this._align[1] * position.h;

      if (!prev || prev[0] !== x || prev[1] !== y) {
        // console.log('Changing', this._node, 'to position:', x, y);
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
    public _elements: HashTableElements;
    public _node: HTMLElement;

    constructor(node: HTMLElement) {
      this._node = node;
      this._elements = <HashTableElements>{};
    }

    addOrUpdateElem(id: string, param: CytoscapeNodeHtmlParams, payload: { data?: any, position?: ICytoscapeNodeHtmlPosition } = {}) {
      let cur = this._elements[id];
      if (cur) {
        cur.updateParams(param);
        cur.updateData(payload.data);
        cur.updatePosition(payload.position);
      } else {
        let nodeElem = document.createElement("div");
        this._node.appendChild(nodeElem);

        this._elements[id] = new LabelElement({
          node: nodeElem,
          data: payload.data,
          position: payload.position
        }, param);
      }
    }

    removeElemById(id: string) {
      if (this._elements[id]) {
        this._node.removeChild(this._elements[id].getNode());
        delete this._elements[id];
      }
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

  function cyNodeHtmlLabel(_cy: any, params: CytoscapeNodeHtmlParams[]) {
    const _params = (!params || typeof params !== "object") ? [] : params;
    const _lc = createLabelContainer();

    _cy.one("render", (e: any) => {
      createNodesCyHandler(e);
      wrapCyHandler(e);
    });
    _cy.on("add", addCyHandler);
    _cy.on("layoutstop", layoutstopHandler);
    _cy.on("remove", removeCyHandler);
    _cy.on("data", updateDataOrStyleCyHandler);
    _cy.on("style", updateDataOrStyleCyHandler);
    _cy.on("pan zoom", wrapCyHandler);
    _cy.on("position bounds", moveCyHandler); // "bounds" - not documented event

    return _cy;

    function createLabelContainer(): LabelContainer {
      let _cyContainer = _cy.container();
      let _titlesContainer = document.createElement("div");

      let _cyCanvas = _cyContainer.querySelector("canvas");
      let cur = _cyContainer.querySelector("[class^='cy-node-html']");
      if (cur) {
        _cyCanvas.parentNode.removeChild(cur);
      }

      let stl = _titlesContainer.style;
      stl.position = 'absolute';
      stl['z-index'] = 10;
      stl.width = '500px';
      stl['pointer-events'] = 'none';
      stl.margin = '0px';
      stl.padding = '0px';
      stl.border = '0px';
      stl.outline = '0px';
      stl.outline = '0px';


      _cyCanvas.parentNode.appendChild(_titlesContainer);

      return new LabelContainer(_titlesContainer);
    }

    function createNodesCyHandler({cy}: ICyEventObject) {
      cy.batch(() => {
        _params.forEach(x => {
          cy.elements(x.query).forEach((d: any) => {
            if (d.isNode()) {
              _lc.addOrUpdateElem(d.id(), x, {
                position: getNodePosition(d),
                data: d.data()
              });
              setBoundsExpansion(d);
            }
          });
        });
      });
    }

    function addCyHandler(ev: ICyEventObject) {
      let target = ev.target;
      let param = $$find(_params.slice().reverse(), x => target.is(x.query));
      if (param) {
        _lc.addOrUpdateElem(target.id(), param, {
          position: getNodePosition(target),
          data: target.data()
        });
        setBoundsExpansion(target);
      }
    }

    function layoutstopHandler({cy}: ICyEventObject) {
      console.log('Layout stop');
      setTimeout(() => {
        _params.forEach(x => {
          cy.elements(x.query).forEach((d: any) => {
            if (d.isNode()) {
              _lc.updateElemPosition(d.id(), getNodePosition(d));
            }
          });
        });
      }, 0);
    }

    function setBoundsExpansion(target: any) {
      if (_lc._elements[target.id()]) {
        let oldBoundsExpansion = target.numericStyle("bounds-expansion");
        if (oldBoundsExpansion.length === 1) {
          oldBoundsExpansion = [oldBoundsExpansion[0], oldBoundsExpansion[0], oldBoundsExpansion[0], oldBoundsExpansion[0]];
        }
        const element = _lc._elements[target.id()];
        const pos = element._position;
        let node =  element.getNode();
        if (node.children && node.children.length === 1) {
          node = node.children[0] as HTMLElement;
          //console.log('DEBUG: hey look i have only 1 child');
        }
        const bb = target.boundingBox();

        const arr = [0, 0, 0, 0];

        const requiredWidth = Math.max(node.offsetWidth - bb.w, 0);
        const requiredHeight = node.offsetHeight;

        //if (target.data("app") === "productpage" && target.data("nodeType") === "service") {
          //console.log("bb.w", bb.w);
          //console.log("node.offsetWidth", node.offsetWidth);
          //console.log("node.offsetHeight", node.offsetHeight);
          arr[1] = arr[3] = requiredWidth * 0.33;
          arr[2] = requiredHeight;
        //} else {
        //  return;
        //}

        // arr[0] += oldBoundsExpansion[0];
        arr[1] += oldBoundsExpansion[1];
        // arr[2] += oldBoundsExpansion[2];
        arr[3] += oldBoundsExpansion[3];



        // console.log('bb', bb);

        if (oldBoundsExpansion.join(" ") !== arr.join(" ")) {
          target.style("bounds-expansion", arr);
          //console.log("Setting new bounds-expansion to", arr, "previous value was", oldBoundsExpansion);
        }
      }
    }

    function removeCyHandler(ev: ICyEventObject) {
      _lc.removeElemById(ev.target.id());
    }

    function moveCyHandler(ev: ICyEventObject) {
      //console.log('moveCyHandler');
      _lc.updateElemPosition(ev.target.id(), getNodePosition(ev.target));
    }

    function updateDataOrStyleCyHandler(ev: ICyEventObject) {
      setTimeout(() => {
        let target = ev.target;
        let param = $$find(_params.slice().reverse(), x => target.is(x.query));
        if (param) {
          _lc.addOrUpdateElem(target.id(), param, {
            position: getNodePosition(target),
            data: target.data()
          });
          setBoundsExpansion(target);
        } else {
          _lc.removeElemById(target.id());
        }
      }, 0);
    }

    function wrapCyHandler({cy}: ICyEventObject) {
      _lc.updatePanZoom({
        pan: cy.pan(),
        zoom: cy.zoom()
      });
    }

    function getNodePosition(node: any): ICytoscapeNodeHtmlPosition {
      return {
        w: node.width(),
        h: node.height(),
        x: node.position("x"),
        y: node.position("y")
      };
    }
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
