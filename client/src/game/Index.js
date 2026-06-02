import React from 'react'
import Phaser from "phaser";
import {BootScene, MenuScene} from "./boot"
import GameScene from "./game"


class Game extends React.Component {
    constructor(props) {
        super(props);
        this.game = null;
    }

    componentDidMount() {
        const config = {
            type: Phaser.AUTO,
            parent: "game",
            width: 960,
            height: 540,
            backgroundColor: 0x0c392f,
            scene: [BootScene, MenuScene, GameScene],
            scale: {
                parent: 'game',
                mode: Phaser.Scale.FIT,
                width: 960,
                height: 540,
            }
        };

        const createGame = this.props.createGame || (gameConfig => new Phaser.Game(gameConfig));
        this.game = createGame(config);
    }

    componentWillUnmount() {
        if (this.game && typeof this.game.destroy === 'function') {
            this.game.destroy(true);
        }
        this.game = null;
    }

    render() {
        return (
            <div className="game-canvas" id="game"></div>
        )
    }

}

export default Game;
