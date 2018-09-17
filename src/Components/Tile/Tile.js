import React, { PureComponent } from 'react';
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

  componentWillMount() {
    this.setTokenOrientation();
  }

  getTokenPosition([ rank, file ]) {
    const { height: tileHeight, startHex } = this.state;

    const width = 194; // The distance between 2 files center points
    const height = 168; // The distance between 2 ranks center points
    const offset = 100; // Half the dimensions of the HTML token element

    let left = (startHex[0] - offset) + ((file - 1) * width);
    let bottom = (tileHeight - startHex[1] - offset) + ((rank - 1) * height);

    if (rank % 2 === 0) {
      left += width / 2;
    }

    return { left, bottom };
  }

  setTokenOrientation() {
    const { props: { rotation }, state: { isHorizontal } } = this;

    const shouldFlip = [30, 90, 150, 210, 270].includes(rotation);
    let orientation = isHorizontal ? 'h' : 'v';

    if (shouldFlip) {
      orientation = orientation === 'h' ? 'v' : 'h';
    }

    this.setState({ tokenOrientation: orientation });
  }

  render() {
    const {
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
        style={{
          top: y,
          left: x,
          width,
          height,
          backgroundImage: `url(images/tiles/${name}.png)`,
          transform: `rotate(${rotation}deg)`
        }}
      >
        <div className="origin" />
        {anchors.map(([ left, top ], index) => (
          <div
            ref={el => this.anchors[index] = el}
            key={`${top}${left}`}
            id={`${name}-${index}`}
            className="anchor"
            style={{ top, left }}
          />
        ))}
        {monsters.map(({ name, pos, type }) => (
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
