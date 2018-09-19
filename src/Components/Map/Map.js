import { sample } from 'lodash';
import React, { PureComponent, createRef } from 'react';
import tileData from '../../tileData.json';
import './Map.css';
import sampleScenario from './sample-scenario.json';
import Scenario from '../Scenario/Scenario';

class Map extends PureComponent {
  state = {
    hoveredTile: false,
    mapX: 0,
    mapY: 0,
    plopper: false,
    plopperTileCoords: '0px, 0px',
    scale: .35,
    scenario: sampleScenario,
    tokenOrientation: 'h',
  };

  constructor(props) {
    super(props);

    this.scenario = createRef();
  }

  get plopperSrc() {
    const { plopper, tokenOrientation } = this.state;

    if (plopper !== false) {
      const fileName = plopper.type === 'monster'
        ? `${plopper.id}-${tokenOrientation}`
        : plopper.id;

      return `images/${plopper.type}s/${fileName}.png`;
    }

    return false;
  }

  get plopperCoords() {
    const { mouseX, mouseY } = this.state;
    const { x, y } = this.getAbsCoords(mouseX, mouseY);
    return `${x}px, ${y}px`;
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleMapClick = ({ clientX, clientY, shiftKey }) => {
    const { hoveredTile, plopper } = this.state;

    if (plopper !== false) {
      if (plopper.type === 'tile') {
        this.plopTile(clientX, clientY, plopper);
        this.setState({ plopper: false });
      } else if (plopper.type === 'monster' && hoveredTile !== false) {
        this.plopMonster(clientX, clientY, plopper);
        if (shiftKey !== true) this.setState({ plopper: false });
      }
    }
  }

  handleTileMouseEnter = (tile, tokenOrientation) => {
    this.setState({ hoveredTile: tile, tokenOrientation });
  }

  handleTileMouseLeave = () => {
    this.setState({ hoveredTile: false });
  }

  handleMouseDown = () => {
    this.setState({ isPanning: true });
  }

  handleMouseUp = () => {
    this.setState({ isPanning: false });
  }

  handleMouseMove = ({ clientX, clientY }) => {
    const { isPanning } = this.state;

    this.setState({mouseX: clientX, mouseY: clientY });

    if (isPanning) {
      const deltaX = clientX - this.state.mouseX;
      const deltaY = clientY - this.state.mouseY;

      this.setState(({ mapX, mapY }) => ({
        mapX: mapX + deltaX,
        mapY: mapY + deltaY,
      }));
    }
  }

  handleKeyDown = (event) => {
    const { key } = event;

    if (key === 'r') {
      event.preventDefault();

      this.setState(({ plopper }) => ({
        plopper: {
          ...plopper,
          rotation: plopper.rotation + 30,
        }
      }));
    } else if (key === 't') {
      event.preventDefault();

      // TO DO: Replace this temp func.
      // const nextTile = tileData['a1a'];
      const nextTile = sample(Object.values(tileData));
      this.setState({
        plopper: {
          type: 'tile',
          id: nextTile.name,
          rotation: 0,
        },
        plopperCoords: this.plopperCoords,
      });
    } else if (key === 'm') {
      event.preventDefault();
      this.setState({
        plopper: {
          type: 'monster',
          id: 'inox-guard',
          rotation: 0,
        },
        plopperCoords: this.plopperCoords,
      });
    }
  }

  plopTile(x, y, plopper) {
    this.scenario.current.placeTile(plopper.id, x, y, plopper.rotation)
      .then(() => this.scenario.current.connectPlacedTileIfPossible(plopper.id));
  }

  plopMonster(x, y, plopper) {
    this.scenario.current.placeMonster(plopper.id, x, y, plopper.rotation);
  }

  getAbsCoords = (x, y) => {
    const { mapX, mapY, scale } = this.state;

    return {
      x: (x / scale) - (mapX / scale),
      y: (y / scale) - (mapY / scale),
    };
  }

  render() {
    const {
      hoveredTile,
      mapX,
      mapY,
      plopper,
      scale,
      scenario,
    } = this.state;

    return (
      <div
        className="map__wrapper"
        onMouseDown={this.handleMouseDown}
        onMouseUp={this.handleMouseUp}
        onMouseMove={this.handleMouseMove}
        onClick={this.handleMapClick}
      >
        <div className="map" style={{
          transform: `translate(${mapX}px, ${mapY}px) scale(${scale})`,
        }}>
          {plopper && (
            <div
              className="plopper-wrapper"
              style={{ transform: `translate(${this.plopperCoords}) rotate(${plopper.rotation}deg)` }}
            >
              <img
                className="plopper"
                src={this.plopperSrc}
                data-type={plopper.type}
                alt=""
              />
            </div>
          )}
          <Scenario
            {...scenario}
            getAbsCoords={this.getAbsCoords}
            handleTileMouseEnter={this.handleTileMouseEnter}
            handleTileMouseLeave={this.handleTileMouseLeave}
            hoveredTile={hoveredTile}
            ref={this.scenario}
            scale={scale}
          />
        </div>
      </div>
    )
  }
}

export default Map;
