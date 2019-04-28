/**
 * Created by ishanarora on 20/04/19.
 */
/**
 * Created by ishanarora on 18/04/19.
 */
const Buffer = require('buffer').Buffer  // note: the trailing slash is important!
const fs     = require('fs');
const bigInteger = require('big-integer');

function quickxorhash() {

    var self = this;

    self.width = 160
    self.shift = 11

    self.shifted = 0
    self.length = 0

    self.cell = new Array(parseInt((self.width - 1) / 64) + 1);

}


quickxorhash.prototype.update = function(data) {

    console.log(data);

    var self = this;

    var cell_index = self.shifted / 64;
    var cell_bitpos = self.shifted % 64;

    for (var i = 0; i < Math.min(data.length, self.width); i++) {
        var next_cell = cell_index + 1;
        var cell_bits = 64;

        if (next_cell == self.cell.length) {
            next_cell = 0;
            if (self.width % 64 > 0) {
                cell_bits = self.width % 64
            }
        }

        var new_byte = bigInteger(0);
        for (var j = i; j < data.length; j += self.width) {
            new_byte = new_byte.xor(bigInteger(data[j]));
        }

        self.cell[cell_index] = new_byte.shiftLeft(cell_bitpos).xor(bigInteger(self.cell[cell_index])).and(bigInteger('ffffffffffffffff', 16));


        if (cell_bitpos > cell_bits - 8)
            self.cell[next_cell] = new_byte.shiftRight((cell_bits - cell_bitpos)).xor(bigInteger(self.cell[next_cell]))  ;

        cell_bitpos += self.shift;

        if (cell_bitpos >= cell_bits) {
            cell_index = next_cell
            cell_bitpos -= cell_bits
        }
    }

    self.shifted += self.shift * (data.length % self.width)
    self.shifted %= self.width;
    self.length += data.length;
    console.log(data.length);
    console.log(self.length);
}


quickxorhash.prototype.finalize =  function() {

    var self = this;
    var bufferV = [];

    for (var i = 0; i < self.cell.length; i++) {
        var bytes = mapping(self.cell[i]);
        let j = i * 8;
        let count = 0;
        while (count < 8) {
            bufferV[j] = bytes[count];
            count++;
            j++;
        }
    }

    const bigIntLenght = new bigInteger(self.length);
    const mappingL = mapping(bigIntLenght);

    let offset = parseInt((self.width / 8) - mappingL.length)


    for (var i = 0; i < mappingL.length; i++) {
        bufferV[offset + i] = bufferV[offset + i].xor(mappingL[i]);
    }

    for (var i = 0; i < bufferV.length; i++) {
        bufferV[i] = parseInt(bufferV[i].toString());
    }

    while (bufferV[bufferV.length - 1] === 0) {
        bufferV.pop();
    }

    return (new Buffer(bufferV)).toString("base64")
}

function mapping(val) {

    var values = [];
    for (var i = 0; i < 8; i++) {
        values[i] = val.and('0xFF');
        val = val.shiftRight(8);
    }

    return values;
}




function operation(filepath) {

    var CHUNK_SIZE = 512 * 1024;
    var buffer = new Buffer(CHUNK_SIZE);

    fs.open(filepath, 'r', function (err, fd) {
        const hash = new quickxorhash();

        if (err) throw err;
        function readNextChunk() {
            fs.read(fd, buffer, 0, CHUNK_SIZE, null, function (err, nread) {
                if (err) throw err;

                if (nread === 0) {
                    // done reading file, do any necessary finalization steps

                    console.log(hash.cell);
                    console.log(hash.finalize());

                    fs.close(fd, function (err) {
                        if (err) throw err;
                    });
                    return;
                }

                var data;
                if (nread < CHUNK_SIZE)
                    data = buffer.slice(0, nread);
                else
                    data = buffer;

                hash.update(data);

                readNextChunk();
            });
        }

        readNextChunk();
    });
}

operation('hello_world.txt');

//module.exports = operation;
