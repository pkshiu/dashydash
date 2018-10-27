'use strict';
const moment = require('moment');

/*
  Board configuration in boards.config.json

  if timeout is not specified, default to 20 (see below)
  Timeout is used to move to the next board

  board_collection_name
    board_name
      timeout
      modules
        module_name

*/

function getBoards(collection) {
  let boards = [];
  for (var b in collection) {
    let modules = [];
    let board = collection[b];
    if (!board.icon) {
      board.icon = 'fa-user-circle-o';
    }
    if (board.timeout === undefined) {
      board.timeout = 20;  // minutes
    }
    for (var m in board.modules) {
      modules.push({
        name : m,
        pos : board.modules[m]
      });
    }
    boards.push({ 
      name : b,
      icon : board.icon,
      timeout : moment.duration(board.timeout, 'minutes'),
      modules : modules
    });
  }
  return boards;
}

class BoardManager {
  getBoards(name) {
    //console.log(name);
    const boardsConfig = require('./boards.config.json');
    const collection = boardsConfig[name] || boardsConfig["default"];
    const boards = getBoards(collection);
    //console.log(boards);
    return boards;
  }
}

module.exports = BoardManager;
