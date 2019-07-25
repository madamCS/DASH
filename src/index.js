const fs = require('fs');
const { google } = require('googleapis');
const readline = require('readline');
var oauth2Client = new google.auth.OAuth2();

exports.analyzeImage = async (req, res) => {
  handleCors(req, res);
  // Get variables from client.
  var inputImageUrl = req.body.fileId;
  var authToken = req.body.auth;
 
  getLabels(inputImageUrl, authToken).then(url => {
    console.log("Returning this Sheet URL to client: " + url);
    res.status(200).type('text/json')
      .end(JSON.stringify(url));
  }).catch(err => {
    console.log("Error: " + err);
    res.status(500).end();
  })
};

// Create column chart.
function createChart(spreadsheetId, authToken) {
  console.log("Inside createChart()");
  
  // Refresh auth token.
  oauth2Client.setCredentials({
   access_token: authToken
  });
  const sheet = google.sheets({version: 'v4', 
                              auth: oauth2Client
                             });  
  
  // JSON request body.
  var chartRequest = { 
   requests: [
    {
      addChart: {
        chart: {
          spec: {
            title: "Vision API Data",
            basicChart: {
              chartType: "COLUMN",
              legendPosition: "BOTTOM_LEGEND",
              axis: [
                {
                  position: "BOTTOM_AXIS",
                  title: "Vision Labels"
                },
                {
                  position: "LEFT_AXIS",
                  title: "Score" 
                }
              ],
              domains: [
                {
                  domain: {
                    sourceRange: {
                      sources: [
                        {
                          startRowIndex: 0,
                          endRowIndex: 5,
                          startColumnIndex: 0,
                          endColumnIndex: 1
                        }
                      ]
                    }
                  }
                }
              ], // closes domains
              series: [
                {
                  series: {
                    sourceRange: {
                      sources: [
                        {
                          startRowIndex: 0,
                          endRowIndex: 7,
                          startColumnIndex: 1,
                          endColumnIndex: 2
                        }
                      ]
                    }
                  }, // closes first Series
                  targetAxis: "LEFT_AXIS"
                } // closes series item
              ],
              headerCount: 1
            } // closes basicChart
          }, // closes spec
          position: {
            newSheet: true
          } // closes position
        } // closes chart
      } // closes add chart
    } // closes requests
  ] // closes requests
  } // closes request

  console.log("Created createChart() request!");
  
  sheet.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: chartRequest,
    }, (err, response) => {
      if (err) {
        console.log(err);
      }
      console.log("createChart response: " + JSON.stringify(response, null, 2));
    });
} 

/** Import vision API label detection data into a Google Sheet.
 */
function writeToSheet(spreadsheetId, labels, labelScores, authToken) {  
  // Create oauth2Client instance.
  oauth2Client.setCredentials({
   access_token: authToken
  });
  const sheet = google.sheets({version: 'v4', 
                              auth: oauth2Client
                             });
    
  // Arrange labels data to insert to sheet.
  var dataString = JSON.stringify(labels, null, 2);
  dataString = dataString.replace(/[\[\]'\"]+/g,'');
  dataString = dataString.split(',');
  var dataLength = dataString.length;
  
  // Arrange label scores to insert to sheet.
  var labelString = JSON.stringify(labelScores, null, 2);
  labelString = labelString.replace(/[\[\]'\"]+/g,'');
  labelString = labelString.split(',');

  // Push all labels + scores to array.
  var values = []
  for (var i = 0; i < dataLength; i++) {
    var dataToPush = [dataString[i], labelString[i]];
    values.push(dataToPush);
  }
        
  // Instance of valueRange.
  var body = {
	values: values
  }

  var request = {
    spreadsheetId: spreadsheetId,
    valueInputOption: 'USER_ENTERED',
    range: 'A1:B',
    resource: body,
    auth: oauth2Client
  };
    
  // Push values to sheet.
  sheet.spreadsheets.values.update(request, {
  }).then(function(res) {
     console.log("Values.update Response: " + JSON.stringify(res, null, 2));
     createChart(spreadsheetId, authToken);
  }).catch(function(err) {
    console.log("Values.update Error: " + err);
  }); 
}

/** Update the sheet's title.
 */
function setSheetTitle(spreadsheetId, authToken) {
  oauth2Client.setCredentials({
   access_token: authToken
  });
  const sheet = google.sheets({version: 'v4', 
                              auth: oauth2Client
                             });  
  
  let requests = [];
  requests.push({
      updateSpreadsheetProperties: {
        properties: {
          title: 'Vision API Data',
        },
        fields: 'title',
      },
    });
  
  const batchUpdateRequest = {requests};
  sheet.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: batchUpdateRequest,
    }, (err, response) => {
      if (err) {
        console.log("Update Title Request Error: " + err);
      }
      console.log("Update Title Response: " + response);
    });
}

/** Create a new Spreadsheet in the Google Account where the 
 * end-user logged in at the client.
 */
async function createSheet(authToken, labels, labelScores) {
  oauth2Client.setCredentials({
   access_token: authToken
  });
  const sheet = google.sheets({version: 'v4', 
                              auth: oauth2Client
                             });  
  
  var request = {
    auth: oauth2Client,
  };
  
   var url = '';
   await sheet.spreadsheets.create(request, { 
  	}).then(function(response)  {
    var spreadsheetId = response.data.spreadsheetId;

    // Call functions.
    writeToSheet(spreadsheetId, labels, labelScores, authToken);
    setSheetTitle(spreadsheetId, authToken);
    url = response.data.spreadsheetUrl;
   }).catch(function(err) { 
     console.log("Caught error is: " + err) 
   });
  return url;
}



/**Gets label detection labels from the Vision API using
 * raw image bytes.
 */
async function getLabels(imageUrl, authToken) {  
  // Import the Google Cloud client library.
  const vision = require('@google-cloud/vision');
  // Create a client.
  const client = new vision.ImageAnnotatorClient();
 
   const imgFileBytes = await getFileBytes(imageUrl);
   const [result] = await client.labelDetection({image: {content: imgFileBytes}});
   var labelsResult = result.labelAnnotations;
   var labels = labelsResult.map(label => label.description);
   var labelScores = labelsResult.map(label => label.score);
  
  // Store the sheet's URL when createSheet() is called.
  var url = '';
  await createSheet(authToken, labels, labelScores).then(res => {
    url = res;
  });
  return url;
}

/** Get raw image file bytes.
 */
async function getFileBytes(fileId) {
  // Set auth credentials.
  let auth = await google.auth.getClient({ 
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  let drive = google.drive({version: 'v3', auth});

  let response = await drive.files.get({
    fileId: fileId,
    alt: 'media'
  }, {
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data); 
}

handleCors = (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
  if (req.method == 'OPTIONS') {
    res.status(204).send('');
  }
}