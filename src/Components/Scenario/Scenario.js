import { chain, isEqual } from 'lodash';
import React, { PureComponent } from 'react';
import tileData from '../../tileData.json';
import Tile from '../Tile/Tile';

class Scenario extends PureComponent {
  state = {
    availableConnections: [],
    tiles: [],
  };

  tileRefs = {};

  constructor(props) {
    super(props);

    this.placeExistingMonstersAndTokens = this.placeExistingMonstersAndTokens.bind(this);
  }

  componentDidMount() {
    const { connections } = this.props;

    if (connections.length) {
      this.placeExistingTiles().then(this.placeExistingMonstersAndTokens);
    }
  }

  placeExistingTiles() {
    const { connections, tiles } = this.props;

    const screenXMidpoint = window.innerWidth / 2;
    const screenYMidpoint = window.innerHeight / 2;

    return connections.reduce((promiseChain, connection) => {
      const { anchor, hook } = connection;
      const {
        [anchor.tile]: { rotation: anchorRotation },
        [hook.tile]: { rotation: hookRotation },
      } = tiles;

      return promiseChain.then((chainResults) => {
        const connectionPromise = Promise.all([
          this.placeTile(anchor.tile, screenXMidpoint, screenYMidpoint, anchorRotation),
          this.placeTile(hook.tile, screenXMidpoint, screenYMidpoint, hookRotation),
        ]).then(this.connectTile.bind(this, connection));

        return connectionPromise.then(result => [...chainResults, result]);
      });
    }, Promise.resolve([]));
  }

  placeExistingMonstersAndTokens() {
    const { tiles } = this.props;

    Object.values(tiles).forEach(({ name, monsters, tokens }) => {
        const tiles = [...this.state.tiles];
        const tile = tiles.find(item => item.name === name);

        if (monsters && monsters.length) tile.monsters = monsters;
        if (tokens && tokens.length) tile.tokens = tokens;

        this.setState({ tiles });
      });
  }

  placeTile(name, x, y, rotation) {
    return new Promise((resolve, reject) => {
      const { getAbsCoords } = this.props;
      const { tiles } = this.state;
      const { anchors, width, height } = tileData[name];

      if (tiles.find(tile => tile.name === name)) return resolve();

      const { x: absX, y: absY } = getAbsCoords(x, y);

      const tile = {
        name,
        x: absX - (width / 2),
        y: absY - (height / 2),
        rotation: rotation % 360,
      };

      const hooks = anchors.map((pos, index) => ({ tile: name, index }));

      this.setState(({ availableConnections, tiles: prevTiles }) => ({
        tiles: [...tiles, tile],
        availableConnections: [ ...availableConnections, ...hooks ],
      }), resolve);
    });
  }

  connectTile({ anchor, hook }) {
    return new Promise((resolve, reject) => {
      const { scale } = this.props;

      const anchorEl = this.tileRefs[anchor.tile].anchors[anchor.index];
      const hookEl = this.tileRefs[hook.tile].anchors[hook.index];

      const { x: anchorX, y: anchorY } = anchorEl.getBoundingClientRect();
      const { x: hookX, y: hookY } = hookEl.getBoundingClientRect();

      this.setState(({ availableConnections: prevConnections, tiles: prevTiles }) => {
        const tiles = [ ...prevTiles ];

        const updatedHook = tiles.find(({ name }) => name === hook.tile);
        updatedHook.x += (anchorX - hookX) / scale;
        updatedHook.y += (anchorY - hookY) / scale;

        const availableConnections = prevConnections.filter(connection =>
          !(isEqual(connection, anchor) || isEqual(connection, hook)));

        return { availableConnections, tiles }
      }, resolve);
    });
  }

  connectPlacedTileIfPossible(tile) {
    const { availableConnections } = this.state;

    const connections = availableConnections.reduce((prev, cur) => {
      const target = cur.tile !== tile ? 'anchors' : 'hooks';
      prev[target].push(cur);
      return prev;
    }, { anchors: [], hooks: [] });

    const anchors = connections.anchors.map(({ tile, index }) => ({
      connection: { tile, index },
      bounds: this.tileRefs[tile].anchors[index].getBoundingClientRect(),
    }));

    const hooks = connections.hooks.map(({ tile, index }) => ({
      connection: { tile, index },
      bounds: this.tileRefs[tile].anchors[index].getBoundingClientRect(),
    }));

    const match = chain(anchors)
      .map(anchor => hooks.map(hook => {
        const leftBounds = anchor.bounds.right - hook.bounds.left;
        const rightBounds = anchor.bounds.left - hook.bounds.right;
        const topBounds = anchor.bounds.top - hook.bounds.bottom;
        const bottomBounds = anchor.bounds.bottom - hook.bounds.top;

        const doesOverlap = leftBounds > 0 && rightBounds < 0 && topBounds < 0 && bottomBounds > 0;
        const closeness = Math.abs(leftBounds + rightBounds + topBounds + bottomBounds);

        return doesOverlap
          ? { anchor: anchor.connection, hook: hook.connection, closeness }
          : false;
      }))
      .flatten().compact().sortBy('closeness').first().value();

    if (match) {
      this.connectTile(match);
    }
  }

  render() {
    const { handleTileClick, scale } = this.props;
    const { tiles } = this.state;

    return (
      <div>
        {tiles.map(tile =>
          <Tile
            {...tile}
            handleTileClick={handleTileClick}
            key={tile.name}
            ref={el => this.tileRefs[tile.name] = el}
            scale={scale}
          />
        )}
      </div>
    );
  }
}

export default Scenario;
