import { sample } from 'lodash';
import React, { PureComponent, createRef } from 'react';
import tileData from '../../tileData.json';
import './Map.css';
import sampleScenario from './sample-scenario.json';
import Scenario from '../Scenario/Scenario';

class Map extends PureComponent {
  state = {
    mapX: 0,
    mapY: 0,
    plopper: false,
    plopperTileCoords: '0px, 0px',
    scale: .35,
    scenario: sampleScenario,
  };

  constructor(props) {
    super(props);

    this.scenario = createRef();
  }

  get plopperCoords() {
    const { mouseX, mouseY } = this.state;
    const { x, y } = this.getAbsCoords(mouseX, mouseY);
    return `${x}px, ${y}px`;
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleMapClick = (event) => {
    const { plopper } = this.state;

    if (plopper !== false) {
      if (plopper.type === 'tile') {
        this.plopTile(event.clientX, event.clientY);
      }

      this.setState({ plopper: false, plopperRotation: 0 });
    }
  }

  handleTileClick = (tile, pos) => {
    console.log('handle tile click', tile, pos);
  }

  handleMouseDown = ({ clientX, clientY }) => {
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
          id: 'inox-guard-h',
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
  getAbsCoords = (x, y) => {
    const { mapX, mapY, scale } = this.state;

    return {
      x: (x / scale) - (mapX / scale),
      y: (y / scale) - (mapY / scale),
    };
  }

  render() {
    const {
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
                src={`images/${plopper.type}s/${plopper.id}.png`}
                data-type={plopper.type}
                alt=""
              />
            </div>
          )}
          <Scenario
            {...scenario}
            getAbsCoords={this.getAbsCoords}
            handleTileClick={this.handleTileClick}
            ref={this.scenario}
            scale={scale}
          />
        </div>
      </div>
    )
  }
}

export default Map;
