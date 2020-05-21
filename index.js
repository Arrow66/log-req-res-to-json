const puppeteer = require('puppeteer');
const atob = require('atob');
const btoa = require('btoa');
const updateJsonFile = require('update-json-file')
const jsonPath = "./reqandres.json"
const scriptUrlPatterns = [
  '*'
]


let promiseArray = [];


async function interceptRequestsForPage(page) {
  const client = await page.target().createCDPSession();



  await client.send('Network.enable');

  await client.send('Network.setRequestInterception', { 
    patterns: scriptUrlPatterns.map(pattern => ({
      urlPattern: pattern, interceptionStage: 'HeadersReceived'
    }))
  });




  const isFound  = (url,method,res)=>(data)=>{

  let elementUndo =  data.findIndex((el)=>{
      return el.url == url && el.method == method
   })

   if(elementUndo != -1)
   {
       data[elementUndo] = {url:url,method:method,response:res}
   }
   else
   {
       data.push(
        {url:url,method:method,response:res}
       )
   }

   return data;

  }

  client.on('Network.requestIntercepted', async ({ interceptionId, request, responseHeaders, resourceType }) => {
    console.log(`Intercepted ${request.url} {interception id: ${interceptionId}}`);

    const response = await client.send('Network.getResponseBodyForInterception',{ interceptionId });

    const bodyData = response.base64Encoded ? atob(response.body) : response.body;

    console.log("bodyData",bodyData,"request",request.url)

    console.log(`Continuing interception ${interceptionId}`)

    await updateJsonFile(jsonPath,isFound(request.url,request.method,bodyData))   


    client.send('Network.continueInterceptedRequest', {
        interceptionId:interceptionId
    });

  });
}

(async function main(){
  const browser = await puppeteer.launch({
    headless:false, 
    defaultViewport:null,
    devtools: true,
    args: ['--window-size=1920,1170','--window-position=0,0']
  });

  const page = (await browser.pages())[0];

  await interceptRequestsForPage(page);



  browser.on('targetcreated', async (target) => {
    const page = await target.page();
    await interceptRequestsForPage(page);
  })

})()