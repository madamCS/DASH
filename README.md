# dash
data + fashion = dash!

1. Pick a file from your Google Drive Photos using the Google Drive Picker (on HTML page).
1. Click "Submit" (on HTML page) to send your image's fileId to the corresponding Google Cloud Function.
1. FileId gets turned into raw file bytes.
1. Raw file bytes get sent to the Google Vision API, where labelDetection results are obtained.
1. Google Sheet is created in end-user's Drive.
1. Labels & their Scores (from labelDetection results) are loaded into the Google Sheet's first 2 columns.
1. Column chart is created from labels (domain) & scores (series) in the spreadsheet.
1. Google spreadsheet's URL is sent back to the client.
1. Google spreadsheet's URL is displayed on HTML page as a link, opened in a new tab.
1. Google spreadsheet has raw data in sheet 1 and chart in sheet 2.

TODO:
1. VisionAPI will be replaced with AutoML trained on fashion trends. 
