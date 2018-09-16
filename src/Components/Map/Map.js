import { chain, sample } from 'lodash';
import React, { Component } from 'react';
import tileData from '../../tileData.json';
import Tile from '../Tile/Tile';
import './Map.css';
import sampleScenario from './sample-scenario.json';

class Map extends Component {
  state = {
    availableHooks: [],
    mapX: 0,
    mapY: 0,
    scale: .35,
    scenario: sampleScenario,
    selectedTile: '',
    selectedTileCoords: '0px, 0px',
    selectedTileRotation: 0,
    tiles: [],
  };

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);

    if (this.state.scenario.connections.length) {
      this.placeExistingTiles();
    }
  }

  handleMapClick = (event) => {
    const { scale, selectedTile, selectedTileRotation } = this.state;

    if (event.target.dataset.tile) {
      const data = tileData[event.target.dataset.tile];
      const tile = this.state.tiles.find(({ name }) => name === event.target.dataset.tile);

      const origin = event.target.querySelector('.origin');
      const { x: originX, y: originY } = origin.getBoundingClientRect();

      const dot = document.createElement('div');

      const rads = tile.rotation * (Math.PI / 180);

      const x = ((event.clientX - originX) / scale);
      const y = -((event.clientY - originY) / scale);

      const left = (x * Math.cos(rads)) - (y * Math.sin(rads));
      const bottom = (x * Math.sin(rads)) + (y * Math.cos(rads));

      dot.classList.add('dot');
      dot.style.bottom = bottom + 'px';
      dot.style.left = left + 'px';
      event.target.appendChild(dot);

      const file = Math.round((left - data.startHex[0]) / 200) + 1;
      const rank = Math.round((bottom - (data.height - data.startHex[1])) / 190) + 1;

      console.log(bottom, data.height, data.startHex[1]);
      console.log([rank, file], bottom - data.height - data.startHex[1])
    }

    if (selectedTile) {
      this.placeTile(selectedTile, event.clientX, event.clientY, selectedTileRotation)
        .then(this.connectPlacedTileIfPossible.bind(this, selectedTile));
    }
  }

  handleMouseDown = ({ clientX, clientY }) => {
    this.setState({
      isPanning: true,
      panX: clientX,
      panY: clientY,
    });
  }

  handleMouseUp = () => {
    this.setState({
      isPanning: false,
      panX: 0,
      panY: 0,
    });
  }

  handleMouseMove = ({ clientX, clientY }) => {
    const { selectedTile } = this.props;
    const { isPanning } = this.state;

    if (isPanning) {
      const deltaX = clientX - this.state.panX;
      const deltaY = clientY - this.state.panY;

      this.setState(({ mapX, mapY }) => ({
        mapX: mapX + deltaX,
        mapY: mapY + deltaY,
        panX: clientX,
        panY: clientY,
      }));
    }

    if (selectedTile) {
      this.setState({
        selectedTileCoords: `${clientX}px, ${clientY}px`,
      })
    }
  }

  handleKeyDown = (event) => {
    const { key } = event;

    if (key === 'r') {
      event.preventDefault();

      this.setState(({ selectedTileRotation }) => ({
        selectedTileRotation: selectedTileRotation + 30,
      }))
    } else if (key === 't') {
      event.preventDefault();

      // TO DO: Replace this temp func.
      // const nextTile = tileData['a1a'];
      const nextTile = sample(Object.values(tileData));
      this.setState({
        selectedTile: nextTile.name,
      });
    }
  }

  placeExistingTiles() {
    const { scenario: { connections } } = this.state;

    const screenXMidpoint = window.innerWidth /2;
    const screenYMidpoint = window.innerHeight /2;

    connections.reduce((promiseChain, connection) => {
      const { anchor, hook } = connection;
      const [ anchorTile ] = anchor.split('-');
      const [ hookTile ] = hook.split('-');

      const anchorData = this.state.scenario.tiles.find(tile => tile.name === anchorTile);
      const hookData = this.state.scenario.tiles.find(tile => tile.name === hookTile);

      return promiseChain.then(chainResults => {
        const connectionPromise = Promise.all([
          this.placeTile(anchorTile, screenXMidpoint, screenYMidpoint, anchorData.rotation),
          this.placeTile(hookTile, screenXMidpoint, screenYMidpoint, hookData.rotation),
        ]).then(this.connectTile.bind(this, connection));

        return connectionPromise.then(result => [ ...chainResults, result ])
      }
      );
    }, Promise.resolve([]));
  }

  placeTile(name, x, y, rotation) {
    return new Promise((resolve, reject) => {
      const { scale, tiles, mapX, mapY } = this.state;
      const { anchors, width, height } = tileData[name];

      if (tiles.find(tile => tile.name === name)) return resolve();

      const tile = {
        name,
        x: (x / scale) - (width / 2) - (mapX / scale),
        y: (y / scale) - (height / 2) - (mapY / scale),
        rotation: rotation % 360,
      }

      const hooks = anchors.map((pos, index) => `${name}-${index}`);

      this.setState(prevState => ({
        selectedTile: null,
        selectedTileRotation: 0,
        tiles: [ ...prevState.tiles, tile ],
        availableHooks: [
          ...prevState.availableHooks,
          ...hooks,
        ]
      }), resolve);
    });
  }

  connectTile(connection) {
    return new Promise((resolve, reject) => {
      const [ hookTile ] = connection.hook.split('-');

      const anchor = document.getElementById(connection.anchor);
      const hook = document.getElementById(connection.hook);

      const { x: anchorX, y: anchorY } = anchor.getBoundingClientRect();
      const { x: hookX, y: hookY } = hook.getBoundingClientRect();

      this.setState(({ scale, tiles: prevTiles }) => {
        const tiles = [ ...prevTiles ];
        const updatedHook = tiles.find(({ name }) => name === hookTile);
        updatedHook.x += (anchorX - hookX) / scale;
        updatedHook.y += (anchorY - hookY) / scale;
        return { tiles }
      }, resolve);
    });
  }

  connectPlacedTileIfPossible(tile) {
    const { availableHooks } = this.state;

    const anchors = availableHooks
      .filter(id => id.indexOf(tile) === -1)
      .map(id => ({ id, bounds: document.getElementById(id).getBoundingClientRect() }));

    const hooks = availableHooks
      .filter(id => id.indexOf(tile) !== -1)
      .map(id => ({ id, bounds: document.getElementById(id).getBoundingClientRect() }));

    const match = chain(anchors)
      .map(anchor => hooks.map(hook => {
        const leftBounds = anchor.bounds.right - hook.bounds.left;
        const rightBounds = anchor.bounds.left - hook.bounds.right;
        const topBounds = anchor.bounds.top - hook.bounds.bottom;
        const bottomBounds = anchor.bounds.bottom - hook.bounds.top;

        const doesOverlap = leftBounds > 0 && rightBounds < 0 && topBounds < 0 && bottomBounds > 0;
        const closeness = Math.abs(leftBounds + rightBounds + topBounds + bottomBounds);

        return doesOverlap ? { anchor: anchor.id, hook: hook.id, closeness } : false;
      }))
      .flatten().compact().sortBy('closeness').first().value();

    if (match) {
      this.connectTile(match);
    }
  }

  render() {
    const {
      mapX,
      mapY,
      scale,
      selectedTile,
      selectedTileCoords,
      selectedTileRotation,
      tiles,
    } = this.state;

    return (
      <div
        className="map__wrapper"
        onMouseDown={this.handleMouseDown}
        onMouseUp={this.handleMouseUp}
        onMouseMove={this.handleMouseMove}
        onClick={this.handleMapClick}
      >
        {selectedTile && (
          <div
            className="selectedTile__wrapper"
            style={{
              transform: `translate(${selectedTileCoords}) rotate(${selectedTileRotation}deg)`,
            }}
          >
            <div
              className="selectedTile"
              style={{
                width: tileData[selectedTile].width,
                height: tileData[selectedTile].height,
                backgroundImage: `url(images/tiles/${selectedTile}.png)`,
                transform: `scale(${scale}) translate(-50%, -50%)`,
              }}
            />
          </div>
        )}
        <div className="map" style={{
          transform: `translate(${mapX}px, ${mapY}px) scale(${scale})`,
        }}>
          {tiles.map(tile => <Tile key={tile.name} {...tile} />)}
        </div>
      </div>
    )
  }
}

export default Map;
