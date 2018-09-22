import React, { createRef, PureComponent } from 'react';
import tileData from '../../tileData.json';
import './Tile.css';

class Tile extends PureComponent {
  static defaultProps = {
    monsters: [],
  };

  state = {
    ...tileData[this.props.name],
  };

  anchors = {};

  constructor(props) {
    super(props);

    this.origin = createRef();
  }

  componentWillMount() {
    this.setTileDimensions();
  }

  handleTileMouseLeave = ({ relatedTarget }) => {
    if (relatedTarget.classList && relatedTarget.classList.contains('map__wrapper')) {
      this.props.handleTileMouseLeave();
    }
  }

  getHexPosition(mouseX, mouseY) {
    const { scale, rotation } = this.props;
    const {
      height,
      isHorizontal,
      startHex,
      tokenHeight,
      tokenWidth,
    } = this.state;

    const rads = rotation * (Math.PI / 180);

    const { x: originX, y: originY } = this.origin.current.getBoundingClientRect();

    const x = ((mouseX - originX) / scale);
    const y = -((mouseY - originY) / scale);

    const left = (x * Math.cos(rads)) - (y * Math.sin(rads));
    const bottom = (x * Math.sin(rads)) + (y * Math.cos(rads));

    let initialRank = bottom - (height - startHex[1]);
    let initialFile = left - startHex[0];

    if (!isHorizontal && Math.round(initialRank / tokenHeight) % 2 === 1) {
      initialFile -= tokenWidth / 2;
    } else if (isHorizontal && Math.round(initialFile / tokenWidth) % 2 === 1) {
      initialRank += tokenHeight / 2;
    }

    const rank = Math.round(initialRank / tokenHeight) + 1;
    const file = Math.round(initialFile / tokenWidth) + 1;

    return [rank, file];
  }

  getTokenPosition([ rank, file ]) {
    const {
      height: tileHeight,
      isHorizontal,
      startHex,
      tokenHeight,
      tokenWidth,
    } = this.state;

    let left = startHex[0] + ((file - 1) * tokenWidth);
    let bottom = tileHeight - startHex[1] + ((rank - 1) * tokenHeight);

    if (!isHorizontal && rank % 2 === 0) {
      left += tokenWidth / 2;
    } else if (isHorizontal && file % 2 === 0) {
      bottom -= tokenHeight / 2;
    }

    return { left, bottom };
  }

  setTileDimensions() {
    const { props: { rotation }, state: { isHorizontal } } = this;

    const shouldFlip = [30, 90, 150, 210, 270].includes(rotation);
    let orientation = isHorizontal ? 'h' : 'v';

    if (shouldFlip) {
      orientation = orientation === 'h' ? 'v' : 'h';
    }

    this.setState({
      tokenOrientation: orientation,
      tokenWidth: !isHorizontal ? 194  : 168,
      tokenHeight: !isHorizontal ? 168 : 195,
    });
  }

  render() {
    const {
      handleTileMouseEnter,
      monsters,
      name,
      order,
      rotation,
      tokens,
      x,
      y,
    } = this.props;

    const {
      anchors,
      height,
      tokenOrientation,
      width,
    } = this.state;

    return (
      <div
        className="Tile"
        data-tile={name}
        onMouseEnter={handleTileMouseEnter.bind(this, name, rotation, tokenOrientation)}
        onMouseLeave={this.handleTileMouseLeave}
        style={{
          backgroundImage: `url(images/tiles/${name}.png)`,
          height,
          left: x,
          top: y,
          transform: `rotate(${rotation}deg)`,
          width,
          zIndex: 1000 - order,
        }}
      >
        <div ref={this.origin} className="Tile__Origin" />
        {anchors.map(([ left, top ], index) => (
          <div
            ref={el => this.anchors[index] = el}
            key={`${top}${left}`}
            className="Tile__Anchor"
            style={{ top, left }}
          />
        ))}
        {Object.values(monsters).map(({ name, pos, type }) => (
          <div
            key={pos}
            className="Monster"
            style={{
              ...this.getTokenPosition(pos),
              backgroundImage: `url(images/monsters/${name}-${tokenOrientation}.png)`,
              transform: `rotate(-${rotation}deg)`,
            }}
          >
            {[2, 3, 4].map(party => (
              <div
                key={party}
                className={`Monster--${tokenOrientation}`}
                data-party={party}
                data-type={type[party]}
              />
            ))}
          </div>
        ))}
        {Object.values(tokens).map(({ name, pos, rotation: tokenRotation = 0 }) => {
          const isMultiHex = /-(2|3)h$/.test(name);
          const hexes = isMultiHex ? RegExp.$1 : 1;

          return (
            <img
              className="Token"
              data-hexes={hexes}
              key={`${name}${pos}`}
              src={`images/tokens/${name}.png`}
              style={{
                ...this.getTokenPosition(pos),
                transform: `rotate(${tokenRotation}deg)`,
              }}
            />
          );
        })}
    </div>
    );
  }
}

export default Tile;
