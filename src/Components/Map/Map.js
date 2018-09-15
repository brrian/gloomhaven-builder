import { chain, sample } from 'lodash';
import React, { Component } from 'react';
import tileData from '../../tileData.json';
import './Map.css';
import Tile from '../Tile/Tile';

class Map extends Component {
  state = {
    availableHooks: [],
    mapX: 0,
    mapY: 0,
    scale: .35,
    selectedTile: '',
    selectedTileCoords: '0px, 0px',
    selectedTileRotation: 0,
    tiles: [],
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleMapClick = (event) => {
    const { scale, selectedTile } = this.state;

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
      this.placeSelectedTile(event.clientX, event.clientY);
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

  placeSelectedTile(x, y) {
    const {
      scale,
      selectedTile,
      selectedTileRotation,
      mapX,
      mapY,
    } = this.state;
    const selectedTileData = tileData[selectedTile];

    const tile = {
      name: selectedTile,
      x: (x / scale) - (selectedTileData.width / 2) - (mapX / scale),
      y: (y / scale) - (selectedTileData.height / 2) - (mapY / scale),
      rotation: selectedTileRotation % 360,
    }

    const hooks = selectedTileData.anchors.map((pos, index) => `${selectedTile}-${index}`);

    this.setState(prevState => ({
      selectedTile: null,
      selectedTileRotation: 0,
      tiles: [ ...prevState.tiles, tile ],
      availableHooks: [
        ...prevState.availableHooks,
        ...hooks,
      ]
    }), this.connectPlacedTileIfPossible.bind(this, tile, hooks));
  }

  connectPlacedTileIfPossible(tile, tileAnchors) {
    const { availableHooks } = this.state;

    const anchors = tileAnchors.map(id => ({ id, bounds: document.getElementById(id).getBoundingClientRect() }));

    const hooks = availableHooks
      .filter(id => id.indexOf(tile.name) === -1)
      .map(id => ({ id, bounds: document.getElementById(id).getBoundingClientRect() }));

    const match = chain(anchors)
      .map(anchor => hooks.map(hook => {
        const leftBounds = anchor.bounds.right - hook.bounds.left;
        const rightBounds = anchor.bounds.left - hook.bounds.right;
        const topBounds = anchor.bounds.top - hook.bounds.bottom;
        const bottomBounds = anchor.bounds.bottom - hook.bounds.top;

        const doesOverlap = leftBounds > 0 && rightBounds < 0 && topBounds < 0 && bottomBounds > 0;
        const closeness = Math.abs(leftBounds + rightBounds + topBounds + bottomBounds);

        const anchorXMidpoint = anchor.bounds.left + (anchor.bounds.width / 2);
        const anchorYMidpoint = anchor.bounds.top + (anchor.bounds.height / 2);

        const hookXMidpoint = hook.bounds.left + (hook.bounds.width / 2);
        const hookYMidpoint = hook.bounds.top + (hook.bounds.height / 2);

        return doesOverlap ?
          {
             anchor: anchor.id,
             hook: hook.id,
             xOffset: anchorXMidpoint - hookXMidpoint,
             yOffset: anchorYMidpoint - hookYMidpoint,
             closeness,
          }
          : false;
      }))
      .flatten()
      .compact()
      .sortBy('closeness')
      .first()
      .value();

    if (!match) return;

    this.setState(({ scale, tiles: prevTiles }) => {
      const tiles = [ ...prevTiles ];
      const updatedTile = tiles.find(({ name }) => tile.name === name);

      updatedTile.x -= (match.xOffset / scale);
      updatedTile.y -= (match.yOffset / scale);

      return { tiles };
    });
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
