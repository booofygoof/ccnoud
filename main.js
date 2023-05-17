const chainId = "1"
const txnBaseURL = "https://etherscan.io/tx/"
const contractBaseURL = "https://etherscan.io/address/"
const bonklerGeneratorURL =  "https://bonklerimg.remilia.org/cgi-bin/bonklercgi?gen="
const largeImgQueryParam = "&meta=no&factor=4" 
const apiEndpoint = "https://bonkler.remilia.org/bonkler?c=" + chainId
async function getMarketCap(coinId) {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    const data = await response.json();
    const marketCap = data.market_cap;

    return marketCap;
  } catch (error) {
    throw new Error('Failed to fetch market cap');
  }
}

let headers = {
    //  "Content-Type": "application/json",
    //  "Access-Control-Allow-Origin": "*",
    //  "Access-Control-Allow-Methods": "GET"
}

const contracts = [
    // TransparentUpgradeableProxy
    { path: "/ABI/AuctionABI.json", addr: "0xF421391011Dc77c0C2489d384C26e915Efd9e2C5"},
    // BonklerNFT
    { path: "/ABI/BonklerNFT.json", addr: "0xABFaE8A54e6817F57F9De7796044E9a60e61ad67"}
]

const libraries = [
    "lib/ethers.umd.min.js",
    "lib/walletconnect.min.js",
    "lib/RemiConnect.js"
]

const traitNames = [
    "BG",
    "Armor",
    "Body",
    "Head",
    "Face",
    "Hand",
    "Offhand",    
    "Pilot"
]

const description = `
Luho Live is a thrilling new ERC20 powercoin project centered around a captivating and enigmatic crypto Twitter micro-celebrity, Luho. With its mysterious origins and unpredictable tokenomics, the Luho Live community is always on edge, eagerly awaiting the next big announcement from their beloved leader.
<br><br>
<p>The tokenomics of Luho Live are shrouded in secrecy, but what is clear is that the coin is designed to fuel Luho's trading conquests. As a result, the Luho Live community is highly engaged in monitoring the markets, keeping an eye out for any big opportunities that might arise, and urging Luho to take profits at just the right moment.</p>

<p>We all love Luho and want him to live the good life, and that's what makes Luho Live such an exciting project to be a part of. With every new trading success, we cheer Luho on, knowing that our support is helping to drive the project forward and make it an even bigger success.</p>

<p>So if you're looking for an exciting new cryptocurrency project to get involved in, look no further than Luho Live. With its thrilling blend of mystery, intrigue, and high-stakes trading, it's sure to keep you on the edge of your seat - and maybe even help you make some money along the way.</p>
<br><br><br>
<iframe
  src="https://app.uniswap.org/#/swap?outputCurrency=0x6982508145454ce325ddbe47a25d4ec3d2311933"
  height="660px"
  width="100%"
  style="
    border: 0;
    margin: 0 auto;
    display: block;
    border-radius: 10px;
    max-width: 600px;
    min-width: 300px;
  "
/>
`

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const viewNames = ["HOME", "LUHOTRAKR", "CREATOR"]
const viewBgColors = ["--bg-green", "--bg-purple", "--bg-yellow"]
let viewHeaders = [ "/auction/", "/bonklers/", "/bonklers/"]

const isDesktopMediaQuery = "(min-aspect-ratio: 5/4)"

// required for fetching bonkler img and creating bids
let curGenerationHash 
// ERC721 token ID of the bonkler shown in home
let curBonklerId
// for customizing bonkler in creator tab. default value = curGenerationHash
let creatorGenerationHash

///////////////////// web3 /////////////////////

let provider, signer, currentAccount
let proxyContract, nftContract, auctionData

let auctionBidEvents, auctionSettledEvents
let prevAuctions = []
let bids = []

let minNextBid
// let expired, 
let hasBid
let usingNextGenHash
let curBonklerMetadata, creatorBonklerMetadata

let curBidEl = document.getElementById("cur-bid")
let bidBtn = document.getElementById("confirm-btn");

let walletBtn = document.getElementsByClassName("wallet").item(0)
let treasuryBtn = document.getElementsByClassName("treasury").item(0)
treasuryBtn.href = contractBaseURL + contracts[1].addr

let allButtons = document.getElementsByTagName("button");
let tableBody = document.getElementById("prev-bids-table").getElementsByTagName("tbody").item(0)

let countdownEl = document.getElementById("countdown")
let countdownId

let ownersGalleryEl = document.getElementById("owners-gallery")
let generalGalleryEl = document.getElementById("general-gallery")
let ownersGallerySize, generalGallerySize 

async function initWeb3()
{   
    await getAuctionData()  
    // update the bonkler shown in home & creator
    async function updateCurBonkler(genHash, isBurned = false)
    {
        creatorGenerationHash = genHash
        let imgUrl = bonklerGeneratorURL + genHash + largeImgQueryParam
        curBonklerEl.src = `Assets/luho.png`

        creatorImg.src = imgUrl
        updateBonklerDownload(creatorGenerationHash)

        let metadataUrl = bonklerGeneratorURL + genHash + metadataQueryParam
        fetch(metadataUrl, { 
            method: "GET", 
            mode: "cors",
            headers: headers
        })
        .then((response) => {
            if (!response.ok) {
                console.log("unable to fetch bonkler metadata. " + response.status); return;
            }
            return response.text()
        })
        .then((data)=> {
            let json
            try { json = JSON.parse(data);} 
            catch(e) { console.log("unable to parse bonkler metadata. " + e); return;  }
            curBonklerMetadata = json
            creatorBonklerMetadata = json
            console.log(`bonkler ${genHash} metadata`, curBonklerMetadata)
            updateTraitsHome()
            updateCreatorMetadata(false)
        })
        .catch((e)=> { console.log(e); return; });
    }

    async function getAuctionData()
    {
        let json 
        let nextGenerationHash
        await fetch(apiEndpoint, { 
            method: "GET", 
            mode: "cors",
            headers: headers
        })
        .then((response) => {
            if (!response.ok) { console.log(e); }
            return response.text()
        })
        .then((data)=> {
            try { 
                json = JSON.parse(data);
                
                auctionData = json.auctionData
                curGenerationHash = json.generationHash
                nextGenerationHash = json.nextGenerationHash
                auctionBidEvents = json.auctionBid
                auctionSettledEvents = json.auctionSettled

                console.log("json", json)
            } 
            catch(e) { console.log(e); }
        })
        .catch((e) => { console.log(e)});

        if (currentAccount != undefined)
        {
            // get auction data via the contract 
            // todo format is different than the one in api
            // auctionData = await proxyContract.auctionData()
        }

        if (auctionData == undefined) 
        {
            showPlaceholder()
            console.log("auctionData not found")
            return;
        }
        resetPlaceholder()
        console.log("auctionData", auctionData)

        // expired = getSecRemaining() == 0
        hasBid = BigInt(auctionData.amount).toString() != "0"
        // console.log(`auction settled = ${auctionData.settled}, hasBid = ${hasBid}, expired = ${expired}`)
        
        // if (auctionData.settled == false && !expired && hasBid)
        if (json.now < auctionData.endTime)
        {
            // ongoing auction
            usingNextGenHash = false
            curBonklerId = auctionData.bonklerId
            curGenerationHash = json.generationHash
            if (curGenerationHash.length == 15) curGenerationHash = "0" + curGenerationHash 
            console.log("showing bonkler", curBonklerId)
        }
        else 
        {
            // use the next gen hash
            usingNextGenHash = true
            // add the leading zero if missing
            if (nextGenerationHash.length == 15) nextGenerationHash = "0" + nextGenerationHash 
            curGenerationHash = nextGenerationHash
            curBonklerId = auctionData.nextBonklerId 
            console.log("next bonkler id", curBonklerId)
            console.log("next generation hash", curGenerationHash)
        }

        if (nextGenerationHash.length < 16) 
        {
            // invalid nextGenerationHash 
            showPlaceholder();
            console.log("auction hasn't started")
            return;
        }

        // reset countdown
        clearInterval(countdownId)
        countdownId = setInterval(() => {
            setCountdownText()
        }, 1000);

        updateCurBonkler(curGenerationHash);
        updateCurrentBid()  
        getPrevBids()
        updateViewHeader(0)
    }

    async function getPrevBids()
    {
        // reset table body
        tableBody.innerHTML = "<tr style='visibility:hidden;'><td class='table-wallet'>1111.eth</td><td class='table-amount'>69.420</td><td class='table-amount'></td></tr>"

        let events
        if (currentAccount == undefined)
        {
            // use data from the api 
            events = auctionBidEvents

            // todo

            if (events == undefined || events.length == 0) 
            {
                console.log("no bids yet"); return;
            }
            for (let i = events.length - 1; i >= 0; i--)
            {
                if (events[i].bonklerId == curBonklerId)
                {
                    let sender = shortenAddress(events[i].bidder, false)
                    let value = ethers.utils.formatEther(events[i].amount)
                    let txn = txnBaseURL + events[i].tx
                    let date = new Date(events[i].timestamp * 1000)
                    let hr = date.getHours()
                    let min = date.getMinutes()
                    let sec = date.getSeconds()
                    date = `${ (hr < 10)? "0" + hr : hr }:${ (min < 10)? "0" + min : min }:${ (sec < 10)? "0" + sec : sec }`
                    tableBody.innerHTML += 
                    `<tr> <td class='table-wallet'>${sender}</td> <td class='table-amount'>${value}</td> <td class='table-txn'> <a href=${txn} target="_blank"><img src='Assets/Desktop/Home/bid_transaction_link_button.svg'></td> <td class='table-date'>${date}</td> </tr>`
                }
            }
        }
        else 
        {
            // get events from the chain 
            let filter = proxyContract.filters.AuctionBid(curBonklerId) 
            events = await proxyContract.queryFilter(filter)
            // let allEvents = await proxyContract.queryFilter(proxyContract.filters.AuctionBid())
            // console.log("all bids events", allEvents)

            if (events.length == 0) 
            {
                console.log("no bids yet"); return;
            }
            for (let i = events.length - 1; i >= 0; i--)
            {
                let sender = shortenAddress(events[i].args.bidder, true)
                let value = ethers.utils.formatEther(events[i].args.amount)
                let txn = txnBaseURL + events[i].transactionHash
                tableBody.innerHTML += 
                `<tr> <td class='table-wallet'>${sender}</td> <td class='table-amount'>${value}</td> <td class='table-txn'> <a href=${txn} target="_blank"><img src='Assets/Desktop/Home/bid_transaction_link_button.svg'></td> </tr>`
            }
        }   
        console.log("bid events for cur bonkler", events)     
    }

	
    // prev auctions can be viewed in home, using curBonklerId as index 
    async function initAuctionHistory()
    {
        if (prevAuctions.length == 0) { return; }

        let maxId = curBonklerId 
        let minId = prevAuctions[0].bonklerId
        
        let container = document.getElementById("auction-bid-container")
        let bigTexts = document.getElementById("auction-big-texts")
        let bidBtns = document.getElementById("mint-btns-container").getElementsByTagName("button")

        let shareCountTexts = document.createElement("div")
        let shareCountEl = document.createElement("span")
        shareCountEl.style.float = "right"
        shareCountTexts.id = "share-container"
        shareCountTexts.textContent = "Share Count: "
        shareCountTexts.appendChild(shareCountEl)

        // prev bonkler
        document.getElementById("prev-next-buttons").getElementsByClassName("prev").item(0).onclick = async function() {
            if (curBonklerId > minId)
            {
                this.disabled = true
                
                if (!container.classList.contains("past-auction-bid-container"))
                {
                    // hide bid buttons
                    container.classList.add("past-auction-bid-container");
                    bidBtnsContainer.style.display = "none"
                    for (let btn of bidBtns) { btn.disabled = true }

                    // show share count texts
                    bigTexts.insertBefore(shareCountTexts, bigTexts.firstChild)

                    clearInterval(countdownId)
                    countdownEl.textContent = ""
                    curBidText.textContent = "Reserve Value: "
                    auctionEndText.textContent = "Burn Status: "
                }
                
                curBonklerId -= 1;
                updateViewHeader(0)
                // share count 
                let shareCount = prevAuctions[curBonklerId - minId].amount
                shareCount = ethers.utils.formatEther(shareCount)
                // shareCountEl.textContent = `Ξ ${shareCount}`
                // reserve value 
                
                let reserveValue = await getMarketCap('bitcoin');
                console.log(reserveValue)
                // curBidEl.textContent = `Ξ ${reserveValue}`
                
                let isBurned = prevAuctions[curBonklerId - minId].burned
                if (isBurned == true) countdownEl.textContent = "[Burned]";
                else if (isBurned == false) countdownEl.textContent = "[Living]";
                else countdownEl.textContent = "???";

                // auctionEndText.textContent = "Auction Ended on: " 
                // countdownEl.textContent = prevAuctions[curBonklerId - minId].date.toDateString()

                let genHash = prevAuctions[curBonklerId - minId].genHash
                console.log(`prev auction bonkler id ${curBonklerId}, gen hash ${genHash}`)
                await updateCurBonkler(genHash, (isBurned == true))
                await getPrevBids()
                this.disabled = false
            }
            // else show btn as "pressed"
        }
        document.getElementById("prev-next-buttons").getElementsByClassName("next").item(0).onclick = async function() {
            if (curBonklerId < maxId - 1)
            {
                this.disabled = true
                curBonklerId += 1;
                updateViewHeader(0)

                // share count 
                let shareCount = prevAuctions[curBonklerId - minId].amount
                shareCount = ethers.utils.formatEther(shareCount)
                // shareCountEl.textContent = `Ξ ${shareCount}`
                // reserve value 
                let reserveValue = parseFloat(shareCount * 0.7).toFixed(2)
                // curBidEl.textContent = `Ξ ${reserveValue}`

                let isBurned = prevAuctions[curBonklerId - minId].burned
                if (isBurned == true) countdownEl.textContent = "[Burned]";
                else if (isBurned == false) countdownEl.textContent = "[Living]";
                else countdownEl.textContent = "???";

                let genHash = prevAuctions[curBonklerId - minId].genHash
                console.log(`next auction bonkler id ${curBonklerId}, gen hash ${genHash}`)
                await updateCurBonkler(genHash, (isBurned == true))
                await getPrevBids()
                this.disabled = false
            }
            else
            {
                // show current auction 
                this.disabled = true

                container.classList.remove("past-auction-bid-container");
                bidBtnsContainer.style.display = "flex"
                bigTexts.removeChild(shareCountTexts)
                
                // curBidText.textContent = "Current Bid: "
                // curBidEl.textContent = ""
                // auctionEndText.textContent = "Auction Ends In: "
                await getAuctionData()
                for (let btn of bidBtns) { btn.disabled = false }
                this.disabled = false
            }            
        }
    }

}

///////////////////// web3 end /////////////////////


///////////////////// ui /////////////////////

let isDesktop = window.matchMedia(isDesktopMediaQuery).matches;

// change view 
let viewElements = document.getElementsByClassName("view");
let navBtns = document.getElementById("nav-content").getElementsByTagName("button");
let titleEl = document.getElementById("title-text")
let prevNextBtns = document.getElementById("prev-next-buttons")
let addrBarDisplay = document.getElementById("address-bar-content")
let bgFill = document.getElementById("bg-color-fill")

let curView = location.hash 
let curViewIndex = 0
let validView = false
if (curView.length > 1)
{
    if (curView.match("[a-zA-Z]+"))
    {
        curView = curView.match("[a-zA-Z]+")[0].toUpperCase()
        for (let i = 0; i < viewNames.length; i++)
        {
            if (viewNames[i] == curView) { curViewIndex = i; }
        }
    } 
}
showView(curViewIndex);

function showView(index)
{
    curViewIndex = index
    addrBarDisplay.textContent = "Luho Coin"

    // nav button highlight 
    for (let i = 0; i < navBtns.length; i++)
    {
        if (i == index) navBtns[i].classList.add("nav-btn-active");
        else navBtns[i].classList.remove("nav-btn-active");
    }

    // show corresponding view
    for (let i = 0; i < viewElements.length; i++)
    {
        if (i === index)
        {
            bgFill.style.backgroundColor = `var(${viewBgColors[i]})`
            titleEl.textContent = viewNames[index];
            viewElements.item(i).style.display = "block";
            viewElements.item(i).scrollTop = "0"
            location.hash = viewNames[index].toLowerCase()
        }
        else viewElements.item(i).style.display = "none";
    }
    // }
    
    // update address bar size
    if (index == 0) 
    {
        // home
        prevNextBtns.style.display = "block"
        if (isDesktop) 
        {
            addrBarDisplay.classList.remove("address-bar-content-long")
            addrBarDisplay.classList.add("address-bar-content-short")
        }
    } 
    else 
    {
        // gallery, creator
        prevNextBtns.style.display = "none"

        if (isDesktop)
        {
            addrBarDisplay.classList.remove("address-bar-content-short")
            addrBarDisplay.classList.add("address-bar-content-long")
        }
    }
    updateViewHeader(index)
}

function updateViewHeader(index, value = "")
{
    if (index == 0)
    {
        if (curBonklerId != undefined) viewHeaders[0] = "/luholive/price #" //+ curBonklerId;
    } 
    else viewHeaders[index] += value;
    if (index == curViewIndex) updateAddrBarContent(viewHeaders[index], false);
}

// nav btns
for (let i = 0; i < navBtns.length; i++)
{
    navBtns.item(0).addEventListener("click", () => { showView(0) })
}

// display a message in the address bar 
function updateAddrBarContent(msg, isError = true)
{
    if (isError) 
    {
        addrBarDisplay.style.color = "var(--red)";
        console.log("error", msg);
    } 
    else addrBarDisplay.style.color = "black";

    if (typeof(msg) === "object") addrBarDisplay.textContent = msg.code + " " + msg.message
    else addrBarDisplay.textContent = msg
}

function shortenAddress(addr, isLong = false)
{
    if (isLong) return addr.slice(0, 4) + "..." + addr.slice(-9);
    else return addr.slice(0, 4) + "..." + addr.slice(-6)
}

// get gen hashes by ids using the api

/////// home ///////

let bidInput = document.getElementById("bid-input")
let bidBtnsContainer = document.getElementById("mint-btns-container")
// let incBidBtn = bidBtnsContainer.getElementsByClassName("increment").item(0)
// let decBidBtn = bidBtnsContainer.getElementsByClassName("decrement").item(0)
let curBidText = document.getElementById("cur-bid-text")
let auctionEndText = document.getElementById("auction-end-text")
let curBonklerEl = document.getElementById("current-bonkler")

// update bid amount and increment with auctionData
function updateCurrentBid()
{
        // bids exist
        getMarketCap('bitcoin')
        .then(marketCap => {
            // curBidEl.textContent = `Ξ ${marketCap}`;
            // console.log(`Market Cap is : `);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

let minutes;
function setDateTime()
{
    let date = new Date()
    let newMinutes = date.getMinutes()
    if (minutes != newMinutes)
    {
        minutes = newMinutes
        let hour = date.getHours()
        let day = date.getDate()
        let month = months[date.getMonth()]

        // console.log(`sec ${date.getSeconds()}, min ${minutes}, hour ${hour}, day ${day}, month ${month}`)
        let minutesStr = (minutes < 10)? ("0" + minutes) : minutes
        let hourStr = (hour < 10)? ("0" + hour) : hour
        let dayStr = (day < 10)? ("0" + day) : day
        document.getElementById("date-time").textContent = `${month} ${dayStr}, ${hourStr}:${minutesStr}`
    }
}

function setCountdownText()
{
    if (auctionData == undefined || auctionData?.endTime == "0") return;

    let secRemaining 
    if (usingNextGenHash) secRemaining = auctionData.duration;
    else secRemaining = getSecRemaining();

    let hour = Math.floor(secRemaining / 3600)
    let min = Math.floor(secRemaining % 3600 / 60)
    let sec = Math.floor(secRemaining % 60)
    // countdownEl.textContent = `${hour}h ${min}m ${sec}s`
}

// seconds remaining of the current auction 
function getSecRemaining()
{
    if (auctionData == undefined) return;
    let now = new Date()
    let endTime = ~~auctionData.endTime; // str to number
    let secRemaining = endTime - Math.round(now.valueOf() / 1000)
    return secRemaining < 0? (0) : (secRemaining)
}
///////////////////// ui end /////////////////////


///////////////////// init /////////////////////

function loadLibraries()
{
   let body = document.getElementsByTagName('body')[0];
   let scriptsLoaded = 0

   for (let i = 0; i < libraries.length; i++)
   {
        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = libraries[i];
        body.appendChild(script)
        script.onload = ()=> { 
            scriptsLoaded++ 
            if (scriptsLoaded == libraries.length) initWeb3();
        }
   }
}

// make sure assets are loaded before their content is populated
function initUITexts()
{
    // nav
    document.getElementById("nav").getElementsByClassName("title-bar").item(0).textContent = "Luho Live"
    navBtns.item(0).innerHTML = '<span style="text-decoration: underline;">L</span>uho'
    navBtns.item(1).innerHTML = '<span style="text-decoration: underline;">C</span>oin'
    navBtns.item(2).innerHTML = '<span style="text-decoration: underline;">L</span>ive'

    // home 
    setDateTime()
    setInterval(() => { 
        setDateTime();
    }, 1000);

    // walletBtn.textContent = "Connect"
    // treasuryBtn.textContent = "Treasury"

    // curBidText.textContent = "Current Bid:"
    // auctionEndText.textContent = "Auction Ends In:"
    // document.getElementById("place-bid-text").textContent = "Place a Bid:"

    let bidsHeader = document.getElementById("bids-header")
    bidsHeader.getElementsByClassName("table-wallet").item(0).textContent = "Wallet"
    bidsHeader.getElementsByClassName("table-amount").item(0).innerHTML = 'Ξ <span style="float:right">Amount</span>'
    bidsHeader.getElementsByClassName("table-txn").item(0).textContent = "Transaction"
    bidsHeader.getElementsByClassName("table-date").item(0).textContent = "Time"

    document.getElementById("description-home").innerHTML = description

    // gallery 
    ownersGalleryEl.getElementsByClassName("gallery-creator-top-bar").item(0).innerHTML = "&nbsp;&nbsp;Owner's_Gallery"
    generalGalleryEl.getElementsByClassName("gallery-creator-top-bar").item(0).innerHTML = "&nbsp;&nbsp;General_Gallery"

    // creator
    document.getElementById("trait-texts").getElementsByTagName("span").item(0).textContent = "Trait Selector"
    document.getElementById("random-bonkler").innerHTML = "Random"
    document.getElementById("save-bonkler").innerHTML = "Save"
}

// show placeholder img and texts in home & creator
function showPlaceholder()
{
    curBidText.textContent = "?"
    auctionEndText.textContent = "?"

    curBonklerEl.src = "Assets/bonkler_loading.png" // or use the generator?
    creatorImg.src = "Assets/bonkler_loading.png"
}

function resetPlaceholder()
{
    // curBidText.textContent = "Current Bid:"
    // auctionEndText.textContent = "Auction Ends In:"
}

window.onload = initUITexts;
loadLibraries();
