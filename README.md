cytoscape-node-html-label
================================================================================

This project was forked off https://github.com/kaluginserg/cytoscape-node-html-label
I forked it off because the projected seemed abandoned, if the author comes back 
I'll try to push my changes there.

## Description

This extension provide ability adding labels for Cytoscape nodes. Simple example:

`cyInstance.nodeHtmlLabel( [{ tpl: d => '<div>' + d + '</div>' }] );`

Demo: https://kaluginserg.github.io/cytoscape-node-html-label/

## Features
- optimised for high performance with high number nodes, for smooth panning and zooming.
- customizable any labels with different templates.

## Dependencies

 * Cytoscape.js ^3.0.0


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-node-html-label`,
 * via bower: `bower install cytoscape-node-html-label`, or
 * via direct download in the repository (probably from a tag).

#### Plain HTML/JS has the extension registered for you automatically:
```html
<script src="http://cytoscape.github.io/cytoscape.js/api/cytoscape.js-latest/cytoscape.min.js"></script>
<script src="cytoscape-node-html-label.js"></script>
```

#### RequireJs approach:
`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var nodeHtmlLabel = require('cytoscape-node-html-label');
nodeHtmlLabel( cytoscape ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-node-html-label'], function( cytoscape, nodeHtmlLabel ){
  nodeHtmlLabel( cytoscape ); // register extension
});
```


## API

nodeHtmlLabel parameter is an array of options:

```js
cyInstance.nodeHtmlLabel(
[
    {
        query: 'node', // cytoscape query selector
        halign: 'center', // title vertical position. Can be 'left',''center, 'right'
        valign: 'center', // title vertical position. Can be 'top',''center, 'bottom'
        halignBox: 'center', // title vertical position. Can be 'left',''center, 'right'
        valignBox: 'center', // title relative box vertical position. Can be 'top',''center, 'bottom'
        cssClass: '', // any classes will be as attribute of <div> container for every title
        tpl: function(data){return '<span>' + data + '</span>';} // your html template here
    }
]
    );
```

## Example usage

Code example:
```js
// create Cy instance
var cyInstance = cytoscape({
    container: document.getElementById('cy'),
    layout: {
        name: 'random'
    },
    elements: [ // your cy elements
        { group: "nodes", data: { id: 'a1', name: 'a10' }, classes: 'l1' },
        { group: "nodes", data: { id: 'a1', name: 'a10' }, classes: 'l1' },
        { group: "nodes", data: { id: 'a1', name: 'a10' }, classes: 'l1' },
        { group: "nodes", data: { id: 'a5', name: 'a5' }, classes: 'l2' }
    ]
});

// set nodeHtmlLabel for your Cy instance
cyInstance.nodeHtmlLabel([{
        query: '.l1',
        valign: "top",
        halign: "left",
        valignBox: "top",
        halignBox: "left",
        tpl: function(data) {
            return '<p class="cy-title__p1">' + data.id + '</p>' + '<p  class="cy-title__p2">' + data.name + '</p>';
        }
    },
    {
        query: '.l2',
        tpl: function(data) {
            return '<p class="cy-title__p1">' + data.id + '</p>' + '<p  class="cy-title__p2">' + data.name + '</p>';
        }
    }
]);

// cyInstance.nodeHtmlLabel returns a `CytoscapeNodeHtmlLabel` instance, you will get the
// same instance if calling on it more times.


// Listening for changes
cyInstance.on('nodehtml-create-or-update nodehtml-delete', function(event, data) {
   // When created/updated data has the label, and you can get the html node with element.getNode()
   // It also has isNew to know if it was created or updated.
   // Target event is the cytoscape node associated to the label.
});

// Requesting an update of a node label
cyInstance.nodeHtmlLabel().updateNodeLabel(cy.$id('a5'))

```

Demo here: https://kaluginserg.github.io/cytoscape-node-html-label/


## how to build and develop:
2) Run `npm start`
2) Create change in src/cytoscape-node-html-label.ts
2) When finished => `npm run test`
2) Prepare js and min files: `npm run build`
2) `git commit`
Then, for version update and publish:
2) Create new npm version: `gulp patch`, `gulp feature` or `gulp release`
2) `npm publish`
