import { sample } from 'lodash';
import React, { PureComponent, createRef } from 'react';
import tileData from '../../tileData.json';
import './Map.css';
import sampleScenario from './sample-scenario.json';
import Scenario from '../Scenario/Scenario';

class Map extends PureComponent {
  state = {
    hoveredTile: { name: false, orientation: 'h', rotation: 0 },
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

  get plopperSrc() {
    const { hoveredTile: { orientation }, plopper } = this.state;

    if (plopper !== false) {
      const fileName = plopper.type === 'monster'
        ? `${plopper.id}-${orientation}`
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
      } else if (plopper.type === 'monster' && hoveredTile.name !== false) {
        this.plopMonster(clientX, clientY, plopper);
        if (shiftKey !== true) this.setState({ plopper: false });
      } else if (plopper.type === 'token' && hoveredTile.name !== false) {
        this.plopToken(clientX, clientY, plopper);
        if (shiftKey !== true) this.setState({ plopper: false });
      }
    }
  }

  handleTileMouseEnter = (name, rotation, orientation) => {
    this.setState(({ hoveredTile,  plopper: prevPlopper }) => {
      const plopper = prevPlopper !== false ? { ...prevPlopper } : prevPlopper;

      if (
        plopper !== false &&
        plopper.type === 'token' &&
        hoveredTile.orientation !== orientation
      ) {
        // Do it like this to make the token switch back and forth.
        // Otherwise  it will just keep incrementing.
        plopper.rotation += orientation === 'h' ? 30 : -30;
      }

      return {
        hoveredTile: { name, rotation, orientation },
        plopper,
      }
    });
  }

  handleTileMouseLeave = () => {
    this.setState(({ hoveredTile}) => ({
      hoveredTile: { ...hoveredTile, name: false }
    }));
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

      this.setState(({ plopper }) => {
        const rotation = plopper.type !== 'token' ? 30 : 60;

        return {
          plopper: { ...plopper, rotation: plopper.rotation + rotation }
        }
      });
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
    } else if (key === 'k') {
      event.preventDefault();
      this.setState({
        plopper: {
          type: 'token',
          id: 'thorns',
          // id: 'corridor-earth-2h',
          // id: 'wood-door-closed',
          hexes: 1,
          rotation: this.state.hoveredTile.rotation,
        }
      });
    }
  }

  plopTile(x, y, plopper) {
    this.scenario.current.placeTile(plopper.id, x, y, plopper.rotation)
      .then(() => this.scenario.current.connectPlacedTileIfPossible(plopper.id));
  }

  plopMonster(x, y, plopper) {
    this.scenario.current.placeMonster(plopper.id, x, y);
  }

  plopToken(x, y, plopper) {
    const { hoveredTile: { rotation } } = this.state;
    this.scenario.current.placeToken(plopper.id, x, y, plopper.rotation - rotation);
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
