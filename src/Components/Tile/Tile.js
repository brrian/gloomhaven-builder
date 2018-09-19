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

    const offset = 100; // Half the dimensions of the HTML token element

    let left = (startHex[0] - offset) + ((file - 1) * tokenWidth);
    let bottom = (tileHeight - startHex[1] - offset) + ((rank - 1) * tokenHeight);

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
      tokenWidth: !isHorizontal ? 194 : 168,
      tokenHeight: !isHorizontal ? 168 : 200,
    });
  }

  render() {
    const {
      handleTileMouseEnter,
      handleTileMouseLeave,
      monsters,
      name,
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
        className="tile"
        data-tile={name}
        onMouseEnter={handleTileMouseEnter.bind(this, name, tokenOrientation)}
        onMouseLeave={handleTileMouseLeave.bind(this)}
        style={{
          top: y,
          left: x,
          width,
          height,
          backgroundImage: `url(images/tiles/${name}.png)`,
          transform: `rotate(${rotation}deg)`
        }}
      >
        <div ref={this.origin} className="origin" />
        {anchors.map(([ left, top ], index) => (
          <div
            ref={el => this.anchors[index] = el}
            key={`${top}${left}`}
            id={`${name}-${index}`}
            className="anchor"
            style={{ top, left }}
          />
        ))}
        {Object.values(monsters).map(({ name, pos, type }) => (
          <div
            key={pos}
            className="monster"
            style={{
              ...this.getTokenPosition(pos),
              backgroundImage: `url(images/monsters/${name}-${tokenOrientation}.png)`,
              transform: `rotate(-${rotation}deg)`,
            }}
          >
            {[2, 3, 4].map(party => (
              <div
                key={party}
                className={`monster-type monster-type-${tokenOrientation}`}
                data-party={party}
                data-type={type[party]}
              />
            ))}
          </div>
        ))}
    </div>
    );
  }
}

export default Tile;
