import logo from './logo.svg';
import 'chessboard-element';
import './App.css';
import React, { Component } from 'react';
import $ from 'jquery';
import { createMoveTree, makeMove, getMove } from './stringParser';
import { Chess } from 'chess.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faToggleOff, faToggleOn } from "@fortawesome/free-solid-svg-icons";

// create moveTree nested dictionary and current branch var (shallow copy)
// play the first (few?) move(s) without input for white
// on input from user:
//   if input was not a valid option on current branch, throw error
//   if there are no more moves on branch, recurse to last point at which branch has 1 path and delete that branch you just went down
//   choose random move from branch and change current branch

// set up color
if (localStorage.getItem('playAs') == null) {
  localStorage.setItem('playAs', 'white');
}
setTimeout(() => {
  if (localStorage.getItem('playAs') == 'white') white();
  else black();
  board = document.getElementById('board');
}, 100);

function white() {
  if (localStorage['playAs'] == 'black') {
    window.location.reload();
  };
  localStorage.setItem('playAs', 'white');
  document.getElementById('white').checked = true;
  document.getElementById('board').orientation = 'white';
  console.log('white');
}

function black() {
  if (localStorage['playAs'] == 'white') {
    window.location.reload();
  };
  localStorage.setItem('playAs', 'black');
  document.getElementById('black').checked = true;
  document.getElementById('board').orientation = 'black';
  console.log('black');
}

// create moveTree nested dictionary and current branch
let game = new Chess();
let board;
let moveTree = createMoveTree();
let currBranch = moveTree; // shallow copy
let lastBranchingDict = moveTree;
let lastBranchingKey = '';
let gameOver = false;
let leftCounter = 0;
let move = '';

document.onkeydown = function (e) {
  e = e || window.event;
  if (e.keyCode == '37') { // left arrow
    if (gameOver) return;
    leftCounter++;
    let gameLen = game.history({ verbose: true }).length;
    if (leftCounter > gameLen - 1) leftCounter = gameLen - 1;
    console.log('leftCounter', leftCounter);
    setPastPosition();
  } else if (e.keyCode == '39') { // right arrow
    if (gameOver) return;
    leftCounter--;
    if (leftCounter < 0) leftCounter = 0;
    setPastPosition();
  } else if (e.keyCode == '13') { // enter
    // enter
  }
}

function setPastPosition() {
  let gameHistory = game.history({ verbose: true });
  let relevantFen = game.history({ verbose: true })[gameHistory.length - 1 - leftCounter].after;
  console.log('relevantFen', relevantFen);
  document.querySelector('chess-board').setPosition(relevantFen);
  console.log(game.history({ verbose: true }));
}

// called when user goes through all branches successfully
function roundComplete() {
  console.log('round complete');
  game = new Chess();
  document.querySelector('chess-board').setPosition(game.fen());

  // find .info-bar and add replace the class 'regularText' with the class 'roundComplete'
  let infoText = document.querySelector('.info-bar');
  infoText.classList.remove('regularText');
  infoText.classList.add('roundComplete');
  gameOver = true;

  // find the .hint and add the gameOver class
  let hintButton = document.querySelector('.hint');
  hintButton.classList.add('gameOver');
}

function wrongMove() {
  console.log('wrong move');
  let infoText = document.querySelector('.info-bar');
  infoText.classList.remove('regularText');
  infoText.classList.add('displayWrongMove');
  setTimeout(() => {
    infoText.classList.remove('displayWrongMove');
    infoText.classList.add('regularText');
  }, 500);
}

function hint() {
  if (gameOver) return;
  let correctMove = makeMove(currBranch);
  let originalPosition = game.fen();
  game.move(correctMove);
  board.setPosition(game.fen());
  setTimeout(() => {
    game.load(originalPosition);
    board.setPosition(game.fen());
  }, 300);

}

function computerMove() {
  move = makeMove(currBranch);
  if (lastBranchingKey == '') lastBranchingKey = move;
  game.move(move);
  board.setPosition(game.fen());
  if (Object.keys(currBranch).length > 1) {
    lastBranchingDict = currBranch;
    lastBranchingKey = move;
  }
  currBranch = currBranch[move];
}

async function validateUserMove(userMove) {
  if (currBranch[userMove + '+'] != undefined) userMove += '+';
  if (currBranch[userMove + '#'] != undefined) userMove += '#';
  if (currBranch['O-O'] != undefined && (userMove == 'Kg8' || userMove== 'Kg1')) userMove = 'O-O';
  if (currBranch['O-O-O'] != undefined && (userMove == 'Kc8' || userMove == 'Kc1')) userMove = 'O-O-O';
  // console.log('event called on userMove', userMove, 'with event object', e.detail);
  if (currBranch[userMove] == undefined) {
    console.log('invalid b/c', userMove, 'is not in currBranch, ', Object.keys(currBranch));
    wrongMove();
    leftCounter = 0;
    await delay(200);
    board.setPosition(game.fen());
    return false;
  }
  if (lastBranchingKey == '') lastBranchingKey = move;
  console.log('move', move, 'branches', Object.keys(currBranch).length, 'times');
  if (Object.keys(currBranch).length > 1) {
    lastBranchingDict = currBranch;
    lastBranchingKey = move;
  }
  console.log('now lastBranchingDict is', lastBranchingDict, 'and lastBranchingKey is', lastBranchingKey);
  return true;
}

const delay = ms => new Promise(res => setTimeout(res, ms));
async function setUpBoard() {
  // load board
  await delay(100);
  const board = document.querySelector('chess-board');
  board.start();

  // play the first move if computer is white
  if (localStorage.getItem('playAs') == 'black') {
    computerMove();
  }

  // on input from user:
  //   if input was not a valid option on current branch, throw error
  //   if there are no more moves on branch, recurse to last point at which branch has 1 path and delete that branch you just went down
  //   choose random move from branch and change current branch
  board.addEventListener('drop', async (e) => {
    // validate users move
    move = getMove(e.detail.newPosition, e.detail.oldPosition);
    try {
      let valid = await validateUserMove(move);
      if (!valid) return;
    } catch(e) { console.log('error', e); }
    
    // play users move
    game.move(move);
    currBranch = currBranch[move];
    await delay(200);

    // if end of branch is reached, restart (first move will be played below)
    if (Object.keys(currBranch).length == 0) {
      game = new Chess();
      board.setPosition(game.fen());
      currBranch = moveTree;

      // prune moveTree
      console.log('pruning 1');
      console.log('pruning', lastBranchingKey, 'from', lastBranchingDict)
      delete lastBranchingDict[lastBranchingKey];
      lastBranchingDict = moveTree;
      lastBranchingKey = '';
      currBranch = moveTree;

      // check if all branches have been played
      if (Object.keys(currBranch).length == 0) {
        roundComplete();
        return;
      }

      // play first move if computer is white
      if (localStorage.getItem('playAs') == 'black') {
        computerMove();
      }
    } else {
      // play computer response
      computerMove();
    }

    // if end of branch is reached, restart and play first move again
    if (Object.keys(currBranch).length == 0) {
      await delay(1000);
      game = new Chess();
      board.setPosition(game.fen());

      // prune moveTree
      console.log('pruning 2');
      console.log('pruning', lastBranchingKey, 'from', lastBranchingDict);
      delete lastBranchingDict[lastBranchingKey];
      lastBranchingDict = moveTree;
      lastBranchingKey = '';
      console.log('movetree is now', moveTree);
      currBranch = moveTree;


      // check if all branches have been played
      if (Object.keys(moveTree).length == 0) {
        roundComplete();
        return;
      }

      // play first move if computer is white
      if (localStorage.getItem('playAs') == 'black') {
        computerMove();
      }
    }
  });
  
}
setUpBoard();

class Toggle extends Component {
  constructor(props) {
    super(props);
    this.state = {
      state: props.state
    }
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState({state: this.state.state == 'on' ? 'off' : 'on'});
  }

  render() {
    return (
      <button className="toggle" onClick={this.toggle}>
        Skip to first branch
        <FontAwesomeIcon className="toggle-icon" icon={this.state.state == 'on' ? faToggleOn : faToggleOff} />
      </button>
    );
  }
}

class Sidebar extends Component {
  render() {
    return (
      <div className="sidebar">
        <h3>Theory Training!</h3>
        <div className="info-bar regularText"></div>
        <button className="hint" onClick={hint}>Hint</button>
        <textarea></textarea>
        
        <div className="color-picker">
          Play as: 
          <label className="label-black">
            <input type="radio" name="color" value="" id="black" onClick={black} />
          </label>
          <label className="label-white">
            <input type="radio" name="color" value="" id="white" onClick={white} />
          </label>
        </div>
        <div className="branch-skip-option">
          <Toggle state="off" />
        </div>
        
      </div>
    );
  }
}

class App extends Component {

  render() {
    return (
      <div className="App">
        <chess-board 
          id="board"
          orientation="black"
          draggable-pieces>
        </chess-board>
        <Sidebar />
      </div>
    );
  }
}

export default App;
