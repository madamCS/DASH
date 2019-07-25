const fs = require('fs');
const { google } = require('googleapis');
const readline = require('readline');
var oauth2Client = new google.auth.OAuth2();


/**
 * HTTP Cloud Function that obtains image file ID &
 * authentication from client & makes calls to 
 * helper functions.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.analyzeImage = async (req, res) => {
  handleCors(req, res);
  
  // Obtains 'POST' request data.
  var inputImageUrl = req.body.fileId;
  var authToken = req.body.auth;
  
  getLabels(inputImageUrl, authToken).then(url => {
    console.log("Returning URL to client: " + url); 
    res.status(200).type('text/json')
      .end(JSON.stringify(url));
  }).catch(err => {
    console.log("Error: " + err);
    res.status(500).end();
  })
};

/**
 * Creates a bar chart with given Sheet's data.
 *
 * @param {String} spreadsheetId ID of sheet to access.
 * @param {String} authToken Authentication to access user's sheet.
 */
function createChart(spreadsheetId, authToken) {
  console.log("Inside createChart()");
  
  oauth2Client.setCredentials({
   access_token: authToken
  });
  const sheet = google.sheets({version: 'v4', 
                              auth: oauth2Client
                             });  
  
  // Initialize chart request variables to simplify JSON request body.
  var axis = [
                {
                  position: "BOTTOM_AXIS",
                  title: "Vision Labels"
                },
                {
                  position: "LEFT_AXIS",
                  title: "Score" 
                }
              ]
  
  var domain_sources = [
                        {
                          startRowIndex: 0,
                          endRowIndex: 5,
                          startColumnIndex: 0,
                          endColumnIndex: 1
                        }
                      ]
  
  var series_sources = [
                        {
                          startRowIndex: 0,
                          endRowIndex: 7,
                          startColumnIndex: 1,
                          endColumnIndex: 2
                        }
                      ]
  
  var domains = [
                {
                  domain: {
                    sourceRange: {
                      sources: domain_sources
                    }
                  }
                }
              ]
 
  
  var series = [
                {
                  series: {
                    sourceRange: {
                      sources: series_sources
                    }
                  }, 
                  targetAxis: "LEFT_AXIS"
                } 
              ]
  
  var chart_specs = {
            title: "Vision API Data",
            basicChart: {
              chartType: "COLUMN",
              legendPosition: "BOTTOM_LEGEND",
              axis: axis,
              domains: domains, // closes domains
              series: series,
              headerCount: 1
            } // closes basicChart
          }
  
  var requests =  [
    {
      addChart: {
        chart: {
          spec: chart_specs, // closes spec
          position: {
            newSheet: true
          } // closes position
        } // closes chart
      } // closes add chart
    } // closes requests
  ] // closes requests
  
  // Creates full chartRequest variable.
  var chartRequest = { 
   requests:requests
  } // closes request

  // Pushes request to sheet.
  sheet.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: chartRequest,
    }, (err, response) => {
      if (err) {
        // Handle error
        console.log(err);
      }
      console.log("CreatingChart response is: " + JSON.stringify(response, null, 2));
    });
  
} // closes createChart()

/**
 * Writes label detection data to the newly created sheet.
 * 
 * @param {String} spreadsheetID ID of sheet to write to.
 * @param {labels} labels
 * @param {num} labelScores
 * @param {String} authToken Authentication to write to user's sheet.
 */
function writeToSheet(spreadsheetId, labels, labelScores, authToken) {
  // Create oauth2Client instance.
  oauth2Client.setCredentials({
   access_token: authToken
  });
    
  // Create sheets instance.
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

  // Print image labels to sheet.
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
    // majorDimension = ROWS by default.
  };
    
  // Update sheet with data.
  sheet.spreadsheets.values.update(request, {
  }).then(function(res) {
     console.log("Values updated! Response is: " + JSON.stringify(res, null, 2));
     createChart(spreadsheetId, authToken);
  }).catch(function(err) {
    console.log("update values err: " + err);
    //Error is that "requested entity not found"
  });
}

/** 
 * Sets existing spreadsheet's title accordingly.
 *
 * @param {String} spreadsheetID ID of sheet to change.
 * @param {String} authToken Authentication to change sheet's
 * properties.
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
          title: 'my new title!',
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
        // Handle error
        console.log(err);
      }
      console.log("BatchUpdate response is: " + response);
    });
}

/**
 * Creates a new spreadsheet in end-user's account.
 *
 * @param {String} authToken Authentication to create sheet.
 * @param {data} labels Information to add to sheet.
 * @param {data} labelScores Information to add to sheet.
 */
async function createSheet(authToken, labels, labelScores) {
  oauth2Client.setCredentials({
   access_token: authToken
  });
  
  const sheet = google.sheets({version: 'v4', 
                              auth: oauth2Client
                             });  
  
  console.log("Access token is: " + authToken);
  
  var request = {
    auth: oauth2Client,
  };
   
   // Create sheet & await response.
   let response = await sheet.spreadsheets.create(request, { 
  	}).catch(function(err) { 
     console.log("Caught error is: " + err) 
   }); 
  
   // Calls additional functions.
   var spreadsheetId = response.data.spreadsheetId;
   writeToSheet(spreadsheetId, labels, labelScores, authToken);
   setSheetTitle(spreadsheetId, authToken);  
  
   // Returns url.
   return response.data.spreadsheetUrl;
}


/** 
 * Gets label detection information from Vision API.
 *
 * @param {String} imageUrl 
 * @param {String} authToken Authorization to create Sheet with
 * obtained Vision API data.
 */
async function getLabels(imageUrl, authToken) {  
  // Imports the Google Cloud client library
  const vision = require('@google-cloud/vision');
  // Creates a client
  const client = new vision.ImageAnnotatorClient();
  //console.log("created client");
 
   const imgFileBytes = await getFileBytes(imageUrl);
   console.log("got file bytes");
   const [result] = await client.labelDetection({image: {content: imgFileBytes}});
   var labelsResult = result.labelAnnotations;
   var labels = labelsResult.map(label => label.description);
   var labelScores = labelsResult.map(label => label.score);
   console.log("VAR labelScores: " + labelScores);
  
   // Returns created sheet's URL.
   return await createSheet(authToken, labels, labelScores);                                                    
}

/** 
 * Takes Drive fileID and obtains file bytes.
 *
 * @param {String} fileID ID of image Drive file to access/
 */
async function getFileBytes(fileId) {
  // get auth
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

/**
 * HTTP function that supports CORS requests.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
handleCors = (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
  if (req.method == 'OPTIONS') {
    res.status(204).send('');
  }
}
