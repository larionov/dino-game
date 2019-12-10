const fs = require('fs'),
      PNG = require('pngjs').PNG;

fs.createReadStream(__dirname + '/input.png')
  .pipe(new PNG({
    filterType: 4
  }))
  .on('parsed', function() {
    console.log(this.height, this.width);

    /*  for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
        var idx = (this.width * y + x) << 2;

        // invert color
        this.data[idx] = 255 - this.data[idx];
        this.data[idx+1] = 255 - this.data[idx+1];
        this.data[idx+2] = 255 - this.data[idx+2];

        // and reduce opacity
                this.data[idx+3] = this.data[idx+3] >> 1;
                }
        }

        this.pack().pipe(fs.createWriteStream('out.png'));*/

    const colorToHex = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, 1)`;

    const getFrame = ({ img, width, height, frame, frameWidth, frameHeight }) => {
      result = [];
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          var idx = (width * y + x + (frame * frameWidth)) * 4;
          result.push({x, y, c: colorToHex(img[idx], img[idx + 1], img[idx + 2], img[idx + 3])});
        }
      }
      return result;
    }


    const framesTotal = Math.floor(this.width / this.height);
    const frame = getFrame({
      img: this.data,
      width: this.width,
      height: this.height,
      frameWidth: 32,
      frameHeight: 32,
      frame: 1
    });

    const getSvgFrame = f => f.map( ({x, y, c}) => `<rect fill="${c}" x="${x}" y="${y}" width="1" height="1" />`).join('\n');

    const output = `
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="beaker" viewBox="0 0 32 32" shape-rendering="crispEdges">
   ${getSvgFrame(frame)}
  </symbol>
</svg>

`;
    fs.writeFile(__dirname + "/output.svg", output, function(err) {

      if(err) {
        return console.log(err);
      }

      console.log("The file was saved!");
    });

  });
