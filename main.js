const infuraKey = "" // temp 

const network = "mainnet"
const chainId = "1"
const txnBaseURL = "https://etherscan.io/tx/"
const contractBaseURL = "https://etherscan.io/address/"

const bonklerGeneratorURL =  "https://bonklerimg.remilia.org/cgi-bin/bonklercgi?gen="
const largeImgQueryParam = "&meta=no&factor=4" 
// const smallImgQueryParam = "&meta=no&factor=1" //&name=bonklerId
const metadataQueryParam = "&meta=yes"
const burnedQueryParam = "&burned=1"
const reserveQueryParam = "&reserve="

const apiEndpoint = "https://bonkler.remilia.org/bonkler?c=" + chainId
const genHashQueryParam = "&ids="
const auctionBidQueryParam = "&auction=" // waiting 4 api update 

const etherscanKey = process.env.ETHERSCAN_KEY

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

// const description2 = `Bonkler is a year-long experimental finance art project as the first reserve-backed NFT. Bonkler’s Paced Generative Mint progressively unveils rarities over the course of a year, obscuring price discovery with speculative complex contrasting aesthetics and rarity.
// <br><br>
// <p>
// “The eternal loving heart of Milady<br>
// The crystal and iron soul of Bonkler<br>
// An auction that runs forever, higher and higher with you and me together.”
// </p>
// <br>
// Bonkler is a Grand Experiment in Financial Art:<br>
// - A new Bonkler is generated every 23 hours and bidded on in 0.1 ETH increments. <br>
// - Redeemable shares are encoded in each Bonkler at minting based on the sale price<br>
// - Shares can be redeemed for ETH from the Treasury by burning the Bonkler.<br>
// - The Bonkler Treasury is fueled by all ETH in each auction minus a 30% fee to Remilia Corporation and team. <br>
// - Each Bonkler is generated with different set of assets in a rarity algorithm whose rates are only revealed over the year-long process of the auction, adding a speculative element on top of aesthetic discernation during the auction process. <br>
// - Only 400 Bonklers will ever be produced, increasing in scarcity as they are burned to redeem their reserve backed value.
// <br><br>
// The Bonkler is a timeless artifact that speculates on the future of the internet & the possible conception of what a post-post historical contemporary could be. The Bonkler is a religious artifact.
// <br><br>
// <p>
// “Looking at Bonkler gives me the same visceral feeling I used to get when I’d watch Gundam with the neighbors at my grandmothers as a kid. Nostalgia doesn't effectively describe it, it's not missing anything, nothing's lost. It’s an overwhelming sense of congruency: This is right.”
// </p>
// <br>
// The Bonkler mission is Synergy. It is synergy of the contemporary, the post-contemporary, the post-post contemporary, & historical contemporary.
// <br><br>
// <p>
// “Bonklers are eclectic gestalts of all things material and tangible. Bonkler gives life to objects you'd never think would exist together, as a beautiful whole.”’`

const description = `
Luho Live is a thrilling new ERC20 powercoin project centered around a captivating and enigmatic crypto Twitter micro-celebrity, Luho. With its mysterious origins and unpredictable tokenomics, the Luho Live community is always on edge, eagerly awaiting the next big announcement from their beloved leader.
<br><br>
<p>The tokenomics of Luho Live are shrouded in secrecy, but what is clear is that the coin is designed to fuel Luho's trading conquests. As a result, the Luho Live community is highly engaged in monitoring the markets, keeping an eye out for any big opportunities that might arise, and urging Luho to take profits at just the right moment.</p>

<p>We all love Luho and want him to live the good life, and that's what makes Luho Live such an exciting project to be a part of. With every new trading success, we cheer Luho on, knowing that our support is helping to drive the project forward and make it an even bigger success.</p>

<p>So if you're looking for an exciting new cryptocurrency project to get involved in, look no further than Luho Live. With its thrilling blend of mystery, intrigue, and high-stakes trading, it's sure to keep you on the edge of your seat - and maybe even help you make some money along the way.</p>
`

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
// const months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"]

const viewNames = ["HOME", "GALLERY", "CREATOR"]
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
    // for (let button of allButtons) { button.disabled = true; }
    await getAuctionData()  

    await getPrevAuctions()
    initGallery()
    initAuctionHistory()

    // for (let button of allButtons) { button.disabled = false; }

    async function handleAccountsChanged()
    {
        signer = provider.getSigner();
        currentAccount = await signer.getAddress()
        console.log("current account " + currentAccount)
        walletBtn.textContent = shortenAddress(currentAccount)

        setOwnerEnsName()
    }

    async function setOwnerEnsName()
    {
        let ensName = await provider.lookupAddress(currentAccount)
        if (ensName == null) return;
        let maxLength = 16;
        if (ensName.length > maxLength)
            walletBtn.textContent = ensName.slice(0, 9) + "..." + ensName.slice(-4);
        else walletBtn.textContent = ensName;
    }

    async function refreshAccount()
    {
        // disable all btns
        for (let button of allButtons) { button.disabled = true; }
        
        await handleAccountsChanged() 

        await initProxyContract()
        await initNFTContract() 
        await getAuctionData()

        // get prev auctions, bids etc from the contract instead of api 
        await getPrevAuctions()
        fillGallery(generalGalleryEl, false)
        fillGallery(ownersGalleryEl, true)
        initAuctionHistory()

        // enable all btns
        for (let button of allButtons) { button.disabled = false; }
        updateViewHeader(curViewIndex)
    }

    // init a single contract 
    async function initContract(path, addr)
    {
        let response = await fetch(path)
        if (!response.ok) 
        {
            updateAddrBarContent(response.status, true)
            throw new Error(response.status)
        } 
        let ABI = await response.json()
        console.log("ABI", ABI)

        return new ethers.Contract(addr, ABI, provider);
    }

    async function initProxyContract()
    {
        proxyContract = await initContract(contracts[0].path, contracts[0].addr)
        console.log("proxyContract", proxyContract); 
    }

    async function initNFTContract()
    {
        nftContract = await initContract(contracts[1].path, contracts[1].addr)
        console.log("nftContract", nftContract)
    }

    // for testing only
    async function initGenerationHashHashes()
    {
        let generationHashHashes = 
        [
            "0x854d7c769a48e2f9af6348a11f507014d67610356a492ac68f200abcea242862", // 0856246375416479
            "0x6cab16e72e9f4fdde51172452bd4984444cc5955d8723e8a68dbe1e05a748952", // 0856246375416280
            "0x47016462f7d30d4595b32c152c8f830d747e32126b4868379468eb3a19426e10", // 6719212439346707
            "0xd7619a9a9631a3dfcc97ae175a6cb77e736542fc51e8b89658a0fb2005a6c4d4", // 4046124523477343
            "0x8d9affe04fe6cb561cbd4c6ab76c5cb795f6f2f2d9b3a8be749911b266d73d49", // 6719222442346808
            "0xf230395f32473f0b395a1cc6e390df8ab22b053b9043f3202b9aa837137f68e5", // 5265944106580041
            "0xcbb64f1f697d39b2877f3362e24e8b6b0d46b58e6c9fd1fe56957d6650678174", // 9347467802292146
        ]

        let proxyWithSigner = proxyContract.connect(signer)
        await proxyWithSigner.addGenerationHashHashes(generationHashHashes)

        await getAuctionData()
    }

    // update the bonkler shown in home & creator
    async function updateCurBonkler(genHash, isBurned = false)
    {
        creatorGenerationHash = genHash

        let imgUrl = bonklerGeneratorURL + genHash + largeImgQueryParam
        // bonkler in HOME shows burn overlay and reserve value
        //curBonklerEl.src = imgUrl + (isBurned? burnedQueryParam : "") // + reserveQueryParam + auctionData.bonklersBalance 
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

    // connect wallet via the RemiConnect modal
    async function connectModal(newProvider)
    {
        console.log("new provider", newProvider)
        provider = new ethers.providers.Web3Provider(newProvider);
        await refreshAccount()

        // event listeners 
        const { provider: ethereum } = provider;
        ethereum.on("accountsChanged", (accounts) => {
            refreshAccount();
        });
        ethereum.on("chainChanged", (chainId) => {
            refreshAccount();
        });
        // ethereum.on("networkChanged", () => {
        //     refreshAccount();
        // });
        // ethereum.on("disconnect", (error) => {
        //     updateAddrBarContent(error, true)
        // });
    
        if (isBidBtn) createBid();

        bidBtn.onclick = createBid;
    }
       
    async function createBid()
    {
        if (auctionData == undefined) return;

        // check bid input value
        let curInputValue // can be set with the +- buttons or manually typed. in wei
        if (bidInput.value == "") 
        {
            // show the default value
            bidInput.value = ethers.utils.formatEther(minNextBid)
            curInputValue = minNextBid
        }
        else 
        {
            // check if the bid value is valid
            try {
                curInputValue = ethers.BigNumber.from( ethers.utils.parseEther(bidInput.value + "") )
            } catch(e) { updateAddrBarContent(e, true); return; }

            // compare BNs
            if (curInputValue.lt(minNextBid)) 
            {
                updateAddrBarContent("Bid too low", true);
                return;
            }
        }
        curInputValue = BigInt(curInputValue).toString()
        console.log(`bonklerId ${curBonklerId}, curGenerationHash ${curGenerationHash}, bid amount ${curInputValue}`)

        // clear error msg if there is any
        updateViewHeader(curViewIndex)

        // create bid
        try {
            let proxyWithSigner = proxyContract.connect(signer)
            let bidTxn = await proxyWithSigner.createBid(
                curBonklerId, curGenerationHash,
                { value: curInputValue, gasLimit: 200000 }
            )
            console.log("createBid txn", bidTxn)

            let receipt = await bidTxn.wait()
            console.log("createBid txn receipt", receipt)
            bidInput.value = ""
            await getAuctionData()
        } catch(e) {
            console.log(e)
            updateAddrBarContent("Unable to create bid", true)
        }
    }

    // wallet btn and bid btn both have their onclick changed by remiConnect  
    // therefore an additional flag is needed 
    let isBidBtn 
    walletBtn.addEventListener("click", ()=> { isBidBtn = false })
    bidBtn.addEventListener("click", ()=> { isBidBtn = true })

    let remiConnect = new RemiConnect(
        [ walletBtn, bidBtn ], 
        {
            infuraId: infuraKey, 
            onConnect: connectModal, 
            onFail: function(error) { updateAddrBarContent(error, true); return; },
        }
    );

    // get auction data, auction bid events, auction settled events 
    // either via the api (when not connected to web3)
    // or via the contracts when connetced
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

        // update treasury
        let treasury = ethers.utils.formatEther(auctionData.bonklersBalance)
        if (treasury < 10) treasury = parseFloat(treasury).toFixed(2);
        else if (treasury < 100) treasury = parseFloat(treasury).toFixed(1);
        else treasury = Math.round(treasury);
        treasuryBtn.textContent = "Treasury " + treasury

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
            // fetch apiEndpoint + auctionBidQueryParam + curBonklerId
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

	async function getPrevAuctions()
    {
        let tokens = []
        let genHashes
        prevAuctions = []

        // get events from api
        if (currentAccount == undefined)
        {
            if (auctionSettledEvents == undefined) return;

            // get token ids
            for (let i = 0; i < auctionSettledEvents.length; i++)
            {
                tokens.push(auctionSettledEvents[i].bonklerId)
            }
            // get generation hashes
            genHashes = await getBonklerHashes(tokens)

            // push to arr
            for (let i = 0; i < auctionSettledEvents.length; i++)
            {
                prevAuctions.push({
                    bonklerId: auctionSettledEvents[i].bonklerId,
                    genHash: genHashes[i],
                    amount: auctionSettledEvents[i].amount,
                    winner: auctionSettledEvents[i].winner,
                    date: new Date(auctionSettledEvents[i].timestamp * 1000),
                    burned: auctionSettledEvents[i].burned
                })
            }
        }
        // get events from the chain
        else 
        {
            let filter = proxyContract.filters.AuctionSettled() 
            let events = await proxyContract.queryFilter(filter)
            console.log("AuctionSettled events", events)  

            // get token ids
            for (let i = 0; i < events.length; i++)
            {
                tokens.push(events[i].args.bonklerId)
            }
            // get generation hashes
            genHashes = await getBonklerHashes(tokens)

            // get ownership info by token ids
            // let ownership = await nftContract.explicitOwnershipsOf(tokens)
            // console.log("explicitOwnershipsOf", ownership)

            // push info to prev auctions arr
            for (let i = 0; i < events.length; i++)
            {
                // console.log("AuctionSettled event", events[i])
                // let block = await provider.getBlock(events[i].blockNumber)
                // console.log("block timestamp", block.timestamp)
                // let startTimestamp = ownership[i].startTimestamp.toNumber()

                prevAuctions.push({
                    bonklerId: events[i].args.bonklerId.toNumber(),
                    genHash: genHashes[i],
                    amount: events[i].args.amount,
                    winner: events[i].args.winner,
                    // date: new Date(startTimestamp * 1000), // auction start date
                    // burned: ownership[i].burned
                    date: new Date(), // temp 
                    burned: false // temp
                })
            }
        }

        if (usingNextGenHash)
        {
            // add the bonkler in auctionData to prev auctions
            prevAuctions.push( {
                bonklerId: auctionData.bonklerId,
                genHash: auctionData.generationHash,
                amount: auctionData.amount,
                winner: auctionData.bidder,
                date: new Date(),
                burned: false
            } )
        }
        console.log("prevAuctions", prevAuctions)
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
                shareCountEl.textContent = `Ξ ${shareCount}`
                // reserve value 
                let reserveValue = parseFloat(shareCount * 0.7).toFixed(2)
                curBidEl.textContent = `Ξ ${reserveValue}`
                
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
        // next bonkler
        document.getElementById("prev-next-buttons").getElementsByClassName("next").item(0).onclick = async function() {
            if (curBonklerId < maxId - 1)
            {
                this.disabled = true
                curBonklerId += 1;
                updateViewHeader(0)

                // share count 
                let shareCount = prevAuctions[curBonklerId - minId].amount
                shareCount = ethers.utils.formatEther(shareCount)
                shareCountEl.textContent = `Ξ ${shareCount}`
                // reserve value 
                let reserveValue = parseFloat(shareCount * 0.7).toFixed(2)
                curBidEl.textContent = `Ξ ${reserveValue}`

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
                
                curBidText.textContent = "Current Bid: "
                curBidEl.textContent = ""
                auctionEndText.textContent = "Auction Ends In: "
                await getAuctionData()
                for (let btn of bidBtns) { btn.disabled = false }
                this.disabled = false
            }            
        }
    }

    // initTestDiv()    
    function initTestDiv()
    {
        let testDiv = document.createElement("div")
        testDiv.id = "test"
        document.getElementById("main-container").append(testDiv)

        let testCloseBtn = document.createElement("button")
        testCloseBtn.textContent = "X"
        testCloseBtn.onclick =  ()=> { testDiv.style.display = "none" }

        let testDataBtn = document.createElement("button")
        testDataBtn.textContent = "get auction data"
        testDataBtn.onclick = getAuctionData

        let testHashesBtn = document.createElement("button")
        testHashesBtn.textContent = "add hashes"
        testHashesBtn.onclick = initGenerationHashHashes

        let testPriorityBtn = document.createElement("button")
        testPriorityBtn.textContent = "test priority"
        
        testPriorityBtn.addEventListener("click", ()=> {
            console.log("click event listener")
        })
        testPriorityBtn.onclick = function() { console.log("onclick") }

        let testBidsBtn = document.createElement("button")
        testBidsBtn.textContent = "fill bids table"
        testBidsBtn.onclick = ()=> {
            let tableEl = document.getElementById("prev-bids-table")
            for (let i = 0; i < 30; i++)
            {
                tableEl.getElementsByTagName("tbody").item(0).innerHTML += 
                "<tr> <td class='table-wallet'>test.eth</td> <td class='table-amount'>69.420</td> <td class='table-txn'> <a><img src='Assets/Desktop/Home/bid_transaction_link_button.svg'></td> </tr>"
            }
        }
        // testBidsBtn.click()

        let testOwnershipBtn = document.createElement("button")
        testOwnershipBtn.textContent = "test explicitOwnershipsOf"
        testOwnershipBtn.onclick = async function() {
            let tokens = [0, 1]
            let ownership = await nftContract.explicitOwnershipsOf(tokens)
            console.log("ownership", ownership)
        }
        
        // let testTreasuryBtn = document.createElement("button")
        // testTreasuryBtn.textContent = "test treasury"
        // testTreasuryBtn.onclick = ()=> {
        //     let balance = 420.6999
        //     if (balance < 10) balance = parseFloat(balance).toFixed(2);
        //     else if (balance < 100) balance = parseFloat(balance).toFixed(1);
        //     else balance = Math.round(balance);
        //     treasuryBtn.textContent = "Treasury " + balance
        // }

        // let testAddrBarBtn = document.createElement("button")
        // testAddrBarBtn.textContent = "test address bar"
        // testAddrBarBtn.onclick = function() { updateAddrBarContent("Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatem tempora reprehenderit incidunt esse nostrum.") }

        // set reserve price
        // set duration
        // init auction house  

        testDiv.append(testCloseBtn, testDataBtn, testHashesBtn, testPriorityBtn, testBidsBtn, testOwnershipBtn)
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

            // add current view name to the site url
            // history.pushState(null, "", `/${viewNames[index].toLowerCase()}`) 
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
    navBtns.item(i).addEventListener("click", () => { showView(i) })
}

// keyboard nav
document.addEventListener("keydown", (e)=> { 
    // console.log("code", e.code)
    // console.log("shift", e.shiftKey)
    if (e.shiftKey)
    {
        if (e.code === "KeyH") showView(0);
        else if (e.code === "KeyG") showView(1);
        else if (e.code === "KeyC") showView(2);
    }
})

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
async function getBonklerHashes(bonklerIds)
{
    let genHashes = []
    let url = apiEndpoint + genHashQueryParam + bonklerIds.join() 
    console.log("gen hashes url", url)

    await fetch(url, { 
        method: "GET", 
        mode: "cors",
        headers: headers
    })
    .then((response) => {
        if (!response.ok) {
            console.log(response.status); return;
        }
        return response.text()
    })
    .then((data)=> {
        let json
        try { json = JSON.parse(data);} 
        catch(e) { console.log(e); return;  }
        for (i = 0; i < json.length; i++)
        {
            if (json[i].length == 15) json[i] = "0" + json[i];
            genHashes.push(json[i])
        }
        console.log("gen hashes", genHashes)
    })
    .catch((e)=> { console.log(e); });
    return genHashes;
}

/////// home ///////

let bidInput = document.getElementById("bid-input")
let bidBtnsContainer = document.getElementById("mint-btns-container")
let incBidBtn = bidBtnsContainer.getElementsByClassName("increment").item(0)
let decBidBtn = bidBtnsContainer.getElementsByClassName("decrement").item(0)

let curBidText = document.getElementById("cur-bid-text")
let auctionEndText = document.getElementById("auction-end-text")

let curBonklerEl = document.getElementById("current-bonkler")

// update bid amount and increment with auctionData
function updateCurrentBid()
{
    let bidValueWei // can only be changed with the inc / dec buttons
    // bidInput.value = ""

    if (ethers.BigNumber.from(auctionData.amount) === "0" || usingNextGenHash)
    {
        // no bids yet
        minNextBid = BigInt(auctionData.reservePrice).toString()
        curBidEl.textContent = `Ξ 0`
    }
    else 
    {
        // bids exist
        minNextBid = ethers.BigNumber.from(auctionData.amount).add(ethers.BigNumber.from(auctionData.bidIncrement))
        curBidEl.textContent = `Ξ ${ethers.utils.formatEther(auctionData.amount)}`
    }
    bidInput.placeholder = `Ξ ${ethers.utils.formatEther(minNextBid)} or more`

    // console.log(`reserve price ${BigInt(auctionData.reservePrice).toString()}, from bid amount ${ethers.BigNumber.from(auctionData.amount).add(ethers.BigNumber.from(auctionData.bidIncrement))}`)

    // buttons for incrementing / decrementing bid amount 
    // default value is minNextBid
    // amounts are in wei and passed as strings (BNs) to retain precision,
    // and converted to ether at the very last step
    incBidBtn.addEventListener("click", ()=> {
        if (bidInput.value == "" || bidValueWei == undefined) 
        {
            bidValueWei = minNextBid
            bidInput.value = ethers.utils.formatEther(bidValueWei)
            return;
        }
        bidValueWei = ethers.BigNumber.from(bidValueWei).add(ethers.BigNumber.from(auctionData.bidIncrement))
        bidInput.value = ethers.utils.formatEther(bidValueWei)
    })

    decBidBtn.addEventListener("click", ()=> {
        if (bidInput.value == "" || bidValueWei == undefined || bidInput.value <= ethers.utils.formatEther(minNextBid)) 
        {
            bidValueWei = minNextBid
            bidInput.value = ethers.utils.formatEther(bidValueWei)
            return;
        }
        bidValueWei = ethers.BigNumber.from(bidValueWei).sub(ethers.BigNumber.from(auctionData.bidIncrement))
        bidInput.value = ethers.utils.formatEther(bidValueWei)
    })
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
    countdownEl.textContent = `${hour}h ${min}m ${sec}s`
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

// traits
let traitsContainer = document.getElementById("bonkler-traits")
let traitsToggle = document.getElementById("auction-small-texts")
traitsToggle.addEventListener("click", () => {
    if (traitsContainer.style.display != "grid")
    {
        traitsContainer.style.display = "grid";
    }
    else 
    {
        traitsContainer.style.display = "none";
    }       
})

function updateTraitsHome()
{
    // trait toggle texts
    let traitsTextsElements = traitsToggle.getElementsByTagName("p")
    for (let element of traitsTextsElements) { element.innerHTML = "" }
    if (curBonklerMetadata && isDesktop)
    {      
        for (let i = 0; i < traitNames.length; i++)
        {
            let traitValue = creatorBonklerMetadata.attributes[i].value

            let curElement
            if (i < 4) curElement = traitsTextsElements.item(0);
            else curElement = traitsTextsElements.item(1);
            
            curElement.innerHTML += traitNames[i] + ": " + traitValue
            if (i < traitNames.length - 1) curElement.innerHTML += "<br>";
        }        
    }
    else traitsTextsElements.item(0).innerHTML = "Show Traits";

    if (!traitsContainer.hasChildNodes())
    {
        // init traits overlay
        for (let i = 0; i < traitNames.length; i++)
        {
            let traitContainer = document.createElement("div")
            traitContainer.classList.add("single-trait-container")

            let traitNameEl = document.createElement("p")
            traitNameEl.textContent = traitNames[i]

            let traitValueEl = document.createElement("p")
            traitValueEl.classList.add("trait-value")
            if (curBonklerMetadata)
            {
                let traitValue = creatorBonklerMetadata.attributes[i].value
                traitValueEl.textContent = traitValue;
            }
            traitContainer.append(traitNameEl, traitValueEl)
            traitsContainer.append(traitContainer)
        }
    }
    else 
    {
        // already inited, update trait overlay values only
        let traitValueEls = document.getElementsByClassName("trait-value")
        for (let i = 0; i < traitValueEls.length; i++)
        {
            if (curBonklerMetadata)
                traitValueEls.item(i).textContent = curBonklerMetadata.attributes[i].value;
        }
    }   
}

/////// gallery ///////

async function initGallery()
{
    // let totalMinted = await nftContract.totalMinted()
    // let totalRedeemed = await nftContract.totalRedeemed()
    // let totalSupply = await nftContract.totalSupply() 
    // console.log(`total minted ${totalMinted}, redeemed ${totalRedeemed}, supply ${totalSupply}`)
    // updateViewHeader(1, `[minted ${totalMinted}/${~~totalSupply + ~~totalRedeemed}] [burned ${totalRedeemed}/${~~totalSupply + ~~totalRedeemed}]`)

    // owner's gallery 
    fillGallery(ownersGalleryEl, true)

    // general gallery 
    fillGallery(generalGalleryEl, false)
}

async function fillGallery(gallery, isOwners)
{
    let tokens = []  // token IDs
    let data = []    // prev bonklers
    if (isOwners)
    {
        if (currentAccount == undefined) { gallery.style.display = "none"; return; }
        tokens = await nftContract.tokensOfOwner(currentAccount)
        for (let i = 0; i < tokens.length; i++)
        {
            tokens[i] = tokens[i].toNumber();
        }
    }   
    else
    {
        for (let i = 0; i < prevAuctions.length; i++)
        {
            tokens.push(prevAuctions[i].bonklerId)
        }
        // current bonkler 
        if (hasBid) tokens.push(curBonklerId);
    }
    console.log("gallery tokens", tokens)
    if (tokens.length === 0) { gallery.style.display = "none"; return; }

    gallery.style.display = "flex"
    let bonklersContainer = gallery.getElementsByClassName("bonklers-container").item(0)
    bonklersContainer.replaceChildren()  // remove all children 

    updateLayoutGallery(gallery, tokens.length)
    if (isOwners) ownersGallerySize = tokens.length;
    else generalGallerySize = tokens.length;

    data = prevAuctions;

    // add current bonkler to general gallery
    if (!isOwners && hasBid) 
    {
        data.push({
            bonklerId: curBonklerId,
            genHash: curGenerationHash,
            amount: auctionData.amount,
            winner: auctionData.bidder,
            date: new Date(),
            burned: false
        })
    }
    
    // set img and info for each bonkler in the gallery
    for (let i = 0; i < data.length; i++)
    {
        let token, genHash, owner, amount, date, burned
        if (isOwners) 
        {
            // get data from the corresponding auction settled event 
            for (let j = 0; j < tokens.length; j++)
            {
                if (data[i].bonklerId == tokens[j]) 
                {
                    token = data[i].bonklerId
                    genHash = data[i].genHash
                    owner = currentAccount
                    amount = data[i].amount
                    date = data[i].date
                    burned = data[i].burned                    
                }
            }
        } 
        else
        {
            token = data[i].bonklerId
            genHash = data[i].genHash
            owner = data[i].winner
            amount = data[i].amount
            date = data[i].date
            burned = data[i].burned
        } 

        let formattedAmount = ethers.utils.formatEther(amount)
        formattedAmount = parseFloat(formattedAmount).toFixed(7)

        let formattedReserveAmount = ethers.utils.formatEther(auctionData.reservePrice)
        formattedReserveAmount = parseFloat(formattedReserveAmount).toFixed(3)

        burned = burned == true
        console.log(`gallery token ${token}, genHash ${genHash}, owner ${owner}, amount ${amount}, date ${date}, burned ${burned}`)
              
        let bonklerContainer = document.createElement("div")
        bonklerContainer.classList.add("bonkler-container")

        let bonklerFrame = document.createElement("div")
        bonklerFrame.classList.add("bonkler-frame-gallery")

        let bonklerImg = document.createElement("img")
        bonklerImg.classList.add("bonkler", "bonkler-gallery")
        bonklerImg.src = bonklerGeneratorURL + genHash + largeImgQueryParam + (burned? burnedQueryParam : "")

        let bonklerInfo = document.createElement("div")
        bonklerInfo.classList.add("bonkler-info")

        let infoContent = document.createElement("p")
        infoContent.classList.add("info-content")

        bonklersContainer.append(bonklerContainer)
        bonklerContainer.append(bonklerFrame, bonklerInfo)
        bonklerFrame.append(bonklerImg)
        bonklerInfo.append(infoContent)

        // temp 
        formattedReserveAmount = "???"
        if (isOwners)
        {   
            infoContent.innerHTML = `BONKLER #${token} <span style="float:right"><button class="rect-small burn">Burn</button></span><br>${shortenAddress(owner, true)}<br>Reserved for: Ξ ${formattedReserveAmount}<br>Bought for: Ξ ${formattedAmount}`

            // burn bonkler :( 
            let burnBtn = infoContent.getElementsByTagName("button").item(0)
            if (burned) burnBtn.classList.add("burnt");
            else 
            {
                burnBtn.addEventListener("click", () => {
                    let nftContractWithSigner = nftContract.connect(signer)
                    nftContractWithSigner.redeemBonkler(token)
                })
            }
        }
        else 
        {
            if (token == curBonklerId) 
                // current bonkler 
                infoContent.innerHTML = `BONKLER #${token} <span style="float:right">${date.getMonth() + 1}-${date.getDate()}-${(date.getFullYear() + "").slice(-2)}</span><br>${shortenAddress(owner, true)}<br>Reserved for: Ξ ${formattedReserveAmount}<br>Current Bid: Ξ ${formattedAmount}`;
            else               
                // past bonkler 
                infoContent.innerHTML = `BONKLER #${token} <span style="float:right">${date.getMonth() + 1}-${date.getDate()}-${(date.getFullYear() + "").slice(-2)}</span><br>${shortenAddress(owner, true)}<br>Reserved for: Ξ ${formattedReserveAmount}<br>Sold for: Ξ ${formattedAmount}`;

            if (burned)
            {
                let span = infoContent.getElementsByTagName("span").item(0)
                span.innerHTML = `<button class="rect-small burnt">Burnt</button>`
            }
        }        
    } // for
}

/////// creator ///////

let creatorImg = document.getElementById("creator-img")
let nameInput = document.getElementById("creator-bonkler-name")
let saveBtn = document.getElementById("save-bonkler")

// desktop
let traitsContainerDesktop = document.getElementById("trait-selector-desktop")
let singleTraitContainers = traitsContainerDesktop.getElementsByClassName("trait-wrapper")

// mobile 
let dropdownMenu = document.getElementById("traits-dropdown")
let dropdownOptions = dropdownMenu.getElementsByTagName("p")
let curTraitDisplay = document.getElementById("cur-trait-display")
let selectedTraitIndex = 4 // face

let canvas = document.createElement("canvas")
let canvasContext = canvas.getContext("2d")
// let imgScale = 4

// generate a scaled up bonkler img using canvas
// to prevent scaling artifacts and for download in creator
// async function generateBigBonkler(genHash)
// {
//     let img = new Image()
//     img.crossOrigin = "anonymous"
//     img.src = bonklerGeneratorURL + genHash
//     // img.src = "testimg.png"
//     // document.getElementById("main-container").appendChild(img) 

//     await img.decode()
//     .catch( (e) => { console.log(e); return; } );

//     canvasContext.clearRect(0, 0, canvas.width, canvas.height)
//     // console.log(`drawing big bonkler ${genHash}...`)

//     canvas.width = img.width * imgScale
//     canvas.height = img.height * imgScale

//     // non-smooth scaling / pixelated 
//     canvasContext.imageSmoothingEnabled = false;
//     canvasContext.mozImageSmoothingEnabled = false;
//     canvasContext.webkitImageSmoothingEnabled = false;
//     canvasContext.msImageSmoothingEnabled = false;

//     canvasContext.drawImage(img, 0, 0, img.width * imgScale, img.height * imgScale)
//     // document.getElementById("main-container").appendChild(canvas) 

//     // url to the high quality img
//     return canvas.toDataURL("image/jpeg", 1.0);
// }

async function updateBonklerDownload(genHash)
{   
    // if (useCache) saveBtn.href = canvas.toDataURL("image/jpeg", 1.0);
    // else saveBtn.href = await generateBigBonkler(genHash);
    
    // cant dl as blob, empty img :(
    // let request = new XMLHttpRequest();
    // request.responseType = 'blob';
    // request.onload = ()=> {
    //     console.log(request)
    //     saveBtn.href = request.response; 
    //     saveBtn.download = `${genHash}.png`;
    // }
    // request.open('GET', bonklerGeneratorURL + genHash + largeImgQueryParam + ".png", true);
    // request.send();

    // get img data url (blob) using canvas
    let img = new Image()
    img.crossOrigin = "anonymous"
    img.src = bonklerGeneratorURL + genHash + largeImgQueryParam
    await img.decode()
    .catch( (e) => { console.log(e); return; } );

    canvasContext.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = img.width
    canvas.height = img.height
    canvasContext.drawImage(img, 0, 0, img.width, img.height)
    // document.getElementById("main-container").appendChild(canvas) 

    // download img with one click
    saveBtn.addEventListener("click", ()=> {
        // name can only contain letters, digits, and underscore
        let namePattern = /^[a-zA-Z\d_]+$/
        let imgName = nameInput.value.match(namePattern)
        if (imgName == null) imgName = genHash

        saveBtn.href = canvas.toDataURL("image/png", 1.0);
        saveBtn.download = `${imgName}.png`
    })
}

function updateCreatorBonkler(traitIndex, isIncrement)
{
    let value = creatorGenerationHash.slice(traitIndex*2, traitIndex*2 + 2)
    let upperBound = 99; let lowerBound = 0; // temp

    value = ~~value // convert to number 
    value = isIncrement? (value += 1) : (value -= 1)
    if (value < lowerBound) value = upperBound;
    if (value > upperBound) value = lowerBound;

    if (value < 10) value = "0" + value;
    creatorGenerationHash = creatorGenerationHash.slice(0, traitIndex*2) + value + creatorGenerationHash.slice((traitIndex*2 + 2), 18)

    console.log("creatorGenerationHash", creatorGenerationHash)
    creatorImg.src = bonklerGeneratorURL + creatorGenerationHash + largeImgQueryParam

    creatorImg.addEventListener("load", ()=> {
        // console.log("loaded creator img")
        updateBonklerDownload(creatorGenerationHash)
    }) 

    updateCreatorMetadata(true)
}

// generate a random bonkler in creator
function getRandomBonkler()
{
    let genHashArray = []
    for (let i = 0; i < traitNames.length; i++) 
    {
        let rand = Math.random() * 99
        rand = Math.round(rand)
        if (rand < 10) rand = "0" + rand;
        else rand = "" + rand;
        genHashArray.push(rand)
    }
    creatorGenerationHash = genHashArray.join("")
    console.log("random generation hash", creatorGenerationHash)
    creatorImg.src = bonklerGeneratorURL + creatorGenerationHash + largeImgQueryParam

    updateCreatorMetadata(true)
}
document.getElementById("random-bonkler").onclick = getRandomBonkler

function initCreatorDesktop()
{
    for (let i = 0; i < singleTraitContainers.length; i++)
    {
        if (i < traitNames.length)
        {
            singleTraitContainers[i].getElementsByClassName("trait-name").item(0).textContent = traitNames[i]

            let incButton = singleTraitContainers[i].getElementsByClassName("next").item(0)
            let decButton = singleTraitContainers[i].getElementsByClassName("prev").item(0)
            incButton.onclick = function() { updateCreatorBonkler(i, true); }
            decButton.onclick = function() { updateCreatorBonkler(i, false) }
        }
        else singleTraitContainers[i].style.display = "none";
    }
}

async function updateCreatorMetadata(useFetch = false)
{
    if (useFetch)
    {
        // fetch metadata
        let metadataUrl = bonklerGeneratorURL + creatorGenerationHash + metadataQueryParam
        await fetch(metadataUrl, { 
            method: "GET", 
            mode: "cors",
            headers: headers
        })
        .then((response) => {
            if (!response.ok) {
                console.log("unable to fetch creator bonkler metadata. " + response.status); return;
            }
            return response.text()
        })
        .then((data)=> {
            let json
            try { json = JSON.parse(data);} 
            catch(e) { console.log(e); return;  }
            creatorBonklerMetadata = json
            console.log(`creator bonkler ${creatorGenerationHash} metadata`, creatorBonklerMetadata)
        })
        .catch((e)=> { console.log(e); return; });
    }

    if(creatorBonklerMetadata == undefined) return;

    // desktop
    for (let i = 0; i < singleTraitContainers.length; i++)
    {
        if (i < traitNames.length)
        {
            let traitValue = creatorBonklerMetadata.attributes[i].value
            singleTraitContainers[i].getElementsByClassName("trait-selector-textbox").item(0).textContent = traitValue
        }
        else singleTraitContainers[i].style.display = "none";
    }

    // mobile
    let traitValue = creatorBonklerMetadata.attributes[selectedTraitIndex].value
    curTraitDisplay.textContent = traitNames[selectedTraitIndex] + ": " + traitValue
}

function initCreatorMobile()
{
    // traits dropdown (mobile only)
    let dropdownExpandBtn = document.getElementById("expand-btn-trait-selector")
    let isExpanded = false
    dropdownExpandBtn.addEventListener("click", () => {
        if (isExpanded == false) showTraitsDropdown();
        else hideTraitsDropdown();
    })

    function showTraitsDropdown()
    {
        isExpanded = true;
        dropdownExpandBtn.style.transform = "rotate(180deg)";
        dropdownMenu.style.visibility = "visible"

        // document.addEventListener("click", hideTraitsDropdown, { once: true })
    }

    function hideTraitsDropdown()
    {
        isExpanded = false;
        dropdownExpandBtn.style.transform = "none";
        dropdownMenu.style.visibility = "hidden"
    }

    // dropdown options click events
    for (let i = 0; i < dropdownOptions.length; i++)
    {
        if (i < (traitNames.length + 1))
        {
            dropdownOptions[i].textContent = traitNames[i - 1]
            dropdownOptions[i].onclick = function() {
                selectedTraitIndex = i - 1
                console.log("selectedTraitIndex", selectedTraitIndex)
                dropdownMenu.getElementsByClassName("selected-trait").item(0).classList.remove("selected-trait");
                dropdownOptions[i].classList.add("selected-trait");
                curTraitDisplay.textContent = dropdownOptions[i].textContent
                hideTraitsDropdown()
            }     
        }
        else dropdownOptions[i].style.display = "none";   
    }

    // increment / decrement traits value 
    let mobileContainer = document.getElementById("trait-selector-mobile")
    let incButton = mobileContainer.getElementsByClassName("next").item(0)
    let decButton = mobileContainer.getElementsByClassName("prev").item(0)

    incButton.onclick = function() { updateCreatorBonkler(selectedTraitIndex, true); }
    decButton.onclick = function() { updateCreatorBonkler(selectedTraitIndex, false) }
}

function updateLayoutCreator()
{
    if (isDesktop) initCreatorDesktop();
    else initCreatorMobile();
}
updateLayoutCreator()

function updateLayoutGallery(gallery, size)
{
    if (size == 0 || gallery.style.display == "none") return;

    let galleryBaseHeight, innerBaseHeight, colNum;
    if (isDesktop)
    {
        galleryBaseHeight = 374;
        innerBaseHeight = 309;
        colNum = 5;
    }
    else
    {
        galleryBaseHeight = 304;
        innerBaseHeight = 237;
        colNum = 3;
    }
    gallery.style.height = galleryBaseHeight + (Math.ceil(size / colNum) - 1) * innerBaseHeight + "px"
    gallery.getElementsByClassName("bonklers-container").item(0).style.height = innerBaseHeight + (Math.ceil(size / colNum) - 1) * innerBaseHeight + "px"
}

window.onresize = function() {
    if (window.matchMedia(isDesktopMediaQuery).matches != isDesktop)
    {
        isDesktop = !isDesktop;
        updateLayoutCreator();
        updateLayoutGallery(ownersGalleryEl, ownersGallerySize)
        updateLayoutGallery(generalGalleryEl, generalGallerySize);
        updateTraitsHome()
    }
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
    document.getElementById("nav").getElementsByClassName("title-bar").item(0).textContent = "Navigation"
    navBtns.item(0).innerHTML = '<span style="text-decoration: underline;">H</span>ome'
    navBtns.item(1).innerHTML = '<span style="text-decoration: underline;">G</span>allery'
    navBtns.item(2).innerHTML = '<span style="text-decoration: underline;">C</span>reator'

    // home 
    setDateTime()
    setInterval(() => { 
        setDateTime();
    }, 1000);

    walletBtn.textContent = "Connect"
    treasuryBtn.textContent = "Treasury"

    curBidText.textContent = "Current Bid:"
    auctionEndText.textContent = "Auction Ends In:"
    document.getElementById("place-bid-text").textContent = "Place a Bid:"

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
    curBidText.textContent = "Current Bid:"
    auctionEndText.textContent = "Auction Ends In:"
}

window.onload = initUITexts;

loadLibraries();
