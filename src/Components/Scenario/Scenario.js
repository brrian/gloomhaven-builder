import produce from 'immer';
import { chain, get, isEqual, keyBy, remove, set } from 'lodash';
import React, { PureComponent } from 'react';
import assetData from '../../assets.json';
import Tile from '../Tile/Tile';

class Scenario extends PureComponent {
  state = {
    availableConnections: [],
    tiles: new Map(),
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

  handleMonsterTypeClick = (tileId, pos, party) => {
    const { tiles: prevTiles } = this.state;

    const nextTypes = {
      elite: 'hidden',
      hidden: 'normal',
      normal: 'elite',
    };

    const tiles = new Map(prevTiles);
    const tile = tiles.get(tileId);

    const typePath = `${pos}.type.${party}`;

    tile.monsters = produce(tile.monsters, draft => {
      const currentType = get(draft, typePath);
      set(draft, typePath, nextTypes[currentType]);
    });

    this.setState({ tiles });
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

      const anchorTile = assetData.tiles.find(({ id }) => id === anchor.tile);
      const hookTile = assetData.tiles.find(({ id }) => id === hook.tile);

      return promiseChain.then((chainResults) => {
        const connectionPromise = Promise.all([
          this.placeTile(anchorTile, screenXMidpoint, screenYMidpoint, anchorRotation),
          this.placeTile(hookTile, screenXMidpoint, screenYMidpoint, hookRotation),
        ]).then(this.connectTile.bind(this, connection));

        return connectionPromise.then(result => [...chainResults, result]);
      });
    }, Promise.resolve([]));
  }

  placeExistingMonstersAndTokens() {
    const { tiles: propTiles } = this.props;

    this.setState(produce(draft => {
      const tiles = new Map(draft.tiles);

      Object.values(propTiles).forEach(({ id, monsters, tokens }) => {
        const tile = tiles.get(id);
        tile.monsters = this.convertExistingMonsters(monsters);
        tile.tokens = this.convertExistingTokens(tokens);
      });

      draft.tiles = tiles;
    }));
  }

  convertExistingMonsters(monsters) {
    const monstersKey = keyBy(assetData.monsters, 'id');

    return chain(monsters)
      .map(monster => ({ ...monstersKey[monster.id], ...monster }))
      .keyBy('pos')
      .value();
  }

  convertExistingTokens(tokens) {
    const tokensKey = keyBy(assetData.tokens, 'id');

    return chain(tokens)
      .map(token => ({ ...tokensKey[token.id], ...token }))
      .reduce((map, cur) => {
        const key = cur.canOverlay ? `overlay-${cur.pos}` : `${cur.pos}`;
        map[key] = cur;
        return map;
      }, {})
      .value();
  }

  placeTile(item, x, y, rotation) {
    return new Promise((resolve, reject) => {
      const { getAbsCoords } = this.props;
      const { tiles } = this.state;

      const { anchors, id, width, height } = item;

      if (tiles.has(id)) {
        return resolve()
      };

      const { x: absX, y: absY } = getAbsCoords(x, y);

      const tile = {
        ...item,
        monsters: [],
        rotation: rotation % 360,
        tokens: [],
        x: absX - (width / 2),
        y: absY - (height / 2),
      };

      const hooks = anchors.map((pos, index) => ({ tile: id, index }));

      this.setState(produce(draft => {
        draft.availableConnections.push(...hooks);
        draft.tiles.set(id, tile);
      }), resolve);
    });
  }

  placeMonster(item, x, y) {
    const { hoveredTile } = this.props;
    const { tiles: prevTiles } = this.state;

    const pos = this.tileRefs[hoveredTile.name].getHexPosition(x, y);

    const tiles = new Map(prevTiles);
    const tile = tiles.get(hoveredTile.name);

    tile.monsters = produce(tile.monsters, draftMonsters => {
      draftMonsters[`${pos}`] = {
        ...item,
        pos,
        type: { 2: 'normal', 3: 'normal', 4: 'normal' },
      };
    });

    this.setState({ tiles });
  }

  placeToken(item, x, y, rotation) {
    const { hoveredTile } = this.props;
    const { tiles: prevTiles } = this.state;

    const pos = this.tileRefs[hoveredTile.name].getHexPosition(x, y);

    // Some tokens can be overlaid on top of other tokens. In these cases we'll
    // want to set a special id for the Map so that up to two tokens can be in
    // the same position (one overlay and one regular token).
    const id = item.canOverlay ? `overlay-${pos}` : `${pos}`;

    const tiles = new Map(prevTiles);
    const tile = tiles.get(hoveredTile.name);

    tile.tokens = produce(tile.tokens, draftTokens => {
      draftTokens[id] = { ...item, pos, rotation };
    });

    this.setState({ tiles });
  }

  connectTile({ anchor, hook }) {
    return new Promise(resolve => {
      const { scale } = this.props;

      const anchorEl = this.tileRefs[anchor.tile].anchors[anchor.index];
      const hookEl = this.tileRefs[hook.tile].anchors[hook.index];

      const { x: anchorX, y: anchorY } = anchorEl.getBoundingClientRect();
      const { x: hookX, y: hookY } = hookEl.getBoundingClientRect();

      this.setState(produce(draft => {
        const hookTile = draft.tiles.get(hook.tile);

        hookTile.x += (anchorX - hookX) / scale;
        hookTile.y += (anchorY - hookY) / scale;

        remove(draft.availableConnections, connection =>
          isEqual(connection, anchor) || isEqual(connection, hook));
      }), resolve);
    });
  }

  connectPlacedTileIfPossible(tile) {
    const { availableConnections } = this.state;

    const connections = availableConnections.reduce((prev, cur) => {
      const target = cur.tile !== tile ? 'anchors' : 'hooks';
      prev[target].push(cur);
      return prev;
    }, { anchors: [], hooks: [] });

    const anchors = connections.anchors.map(({ tile: tileId, index }) => ({
      bounds: this.tileRefs[tileId].anchors[index].getBoundingClientRect(),
      connection: { tile: tileId, index },
    }));

    const hooks = connections.hooks.map(({ tile: tileId, index }) => ({
      bounds: this.tileRefs[tileId].anchors[index].getBoundingClientRect(),
      connection: { tile: tileId , index },
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
    const {
      handleTileMouseEnter,
      handleTileMouseLeave,
      scale,
    } = this.props;
    const { tiles } = this.state;

    return (
      <div>
        {Array.from(tiles.values()).map((tile, index) =>
          <Tile
            {...tile}
            handleTileMouseEnter={handleTileMouseEnter}
            handleTileMouseLeave={handleTileMouseLeave}
            handleMonsterTypeClick={this.handleMonsterTypeClick}
            key={tile.id}
            order={index}
            ref={el => this.tileRefs[tile.id] = el}
            scale={scale}
          />
        )}
      </div>
    );
  }
}

export default Scenario;
