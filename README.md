# Fashion Data Analytics Powered by Google Cloud & Machine Learning.

_Using Google Cloud Functions, autoML, and the Sheets API to generate
data analytics on fashion-related images._

At a time where many fashion companies are suffering due to a so-called [tech deficit][bof-article], it is crucial for them to be able to keep up with the fast-paced world of technological
innovation. DASH signifies the intersection between data and fashion, and this solution
aims to further blur this divide by easily allowing fashion companies to perform data
analytics on their images by using [Google Cloud Functions][g-c-f], [AutoML][auto-ml], and the [Sheets API][sheets-api]. 

Ultimately, the framework used in this solution can be replicated for any vertical, as its purpose
is purely to demonstrate how Cloud & AutoML can be used to further advance methods of data analytics
within companies.

[g-c-f]:http://cloud.google.com/functions
[auto-ml]: https://cloud.google.com/automl/
[sheets-api]: https://developers.google.com/sheets/api/

## Technology Highlights:
- Google Picker is launched from the client, allowing an end-user to 
  pick an image from her Google Drive Photos.
- Image Drive file ID and end-user authentication are sent from the client
  to the server through a 'POST' request.
- Google Cloud Functions (server) obtains parameters from client
- GCF uses the Drive API to obtain image file bytes from file's Drive ID
- GCF sends image file bytes through the Vision API (autoML) & obtains label
  detection data
- Label detection data is inputted into a newly created Google Sheet
- Sheets API is used to generate a column chart from label detection data
- Created sheet (with data + chart) URL is sent back to the client & displayed
  to the end-user


## TODO:
1. VisionAPI will be replaced with AutoML trained on fashion trends.

