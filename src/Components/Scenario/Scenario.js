import { chain } from 'lodash';
import React, { Component } from 'react';
import tileData from '../../tileData.json';
import Tile from '../Tile/Tile';

class Scenario extends Component {
  state = {
    availableHooks: [],
    tiles: [],
  };

  componentDidMount() {
    const { connections } = this.props;

    if (connections.length) {
      this.placeExistingTiles();
    }
  }

  placeExistingTiles() {
    const { connections, tiles } = this.props;

    const screenXMidpoint = window.innerWidth / 2;
    const screenYMidpoint = window.innerHeight / 2;

    connections.reduce((promiseChain, connection) => {
      const { anchor, hook } = connection;
      const [anchorTile] = anchor.split('-');
      const [hookTile] = hook.split('-');

      const anchorData = tiles.find(tile => tile.name === anchorTile);
      const hookData = tiles.find(tile => tile.name === hookTile);

      return promiseChain.then((chainResults) => {
        const connectionPromise = Promise.all([
          this.placeTile(anchorTile, screenXMidpoint, screenYMidpoint, anchorData.rotation),
          this.placeTile(hookTile, screenXMidpoint, screenYMidpoint, hookData.rotation),
        ]).then(this.connectTile.bind(this, connection));

        return connectionPromise.then(result => [...chainResults, result]);
      });
    }, Promise.resolve([]));
  }

  placeTile(name, x, y, rotation) {
    return new Promise((resolve, reject) => {
      const { map } = this.props;
      const { tiles } = this.state;
      const { anchors, width, height } = tileData[name];

      if (tiles.find(tile => tile.name === name)) return resolve();

      const tile = {
        name,
        x: (x / map.scale) - (width / 2) - (map.x / map.scale),
        y: (y / map.scale) - (height / 2) - (map.y / map.scale),
        rotation: rotation % 360,
      };

      const hooks = anchors.map((pos, index) => `${name}-${index}`);

      this.setState(prevState => ({
        tiles: [...prevState.tiles, tile],
        availableHooks: [
          ...prevState.availableHooks,
          ...hooks,
        ],
      }), resolve);
    });
  }

  connectTile(connection) {
    return new Promise((resolve, reject) => {
      const { map: { scale } } = this.props;
      const [ hookTile ] = connection.hook.split('-');

      const anchor = document.getElementById(connection.anchor);
      const hook = document.getElementById(connection.hook);

      const { x: anchorX, y: anchorY } = anchor.getBoundingClientRect();
      const { x: hookX, y: hookY } = hook.getBoundingClientRect();

      this.setState(({ tiles: prevTiles }) => {
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
    const { tiles } = this.state;

    return (
      <div>
        {tiles.map(tile => <Tile key={tile.name} {...tile} />)}
      </div>
    );
  }
}

export default Scenario;
