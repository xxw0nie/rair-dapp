import {useState, useEffect, useCallback} from 'react';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import {useHistory} from 'react-router-dom';
import { metamaskCall } from '../../../utils/metamaskUtils'; 
import chainData from '../../../utils/blockchainData';
import WorkflowContext from '../../../contexts/CreatorWorkflowContext.js';
import FixedBottomNavigation from '../FixedBottomNavigation.jsx';
import MarketplaceOfferConfig from './MarketplaceOfferConfig.jsx';

const DiamondMinterMarketplace = ({contractData, setStepNumber, steps, simpleMode, stepNumber, gotoNextStep}) => {
	const { diamondMarketplaceInstance } = useSelector(store => store.contractStore);
	const history = useHistory();

	const [offerData, setOfferData] = useState([]);
	const [nodeFee, setNodeFee] = useState(0);
	const [treasuryFee, setTreasuryFee] = useState(0);
	const [treasuryAddress, setTreasuryAddress] = useState(undefined);
	const [minterDecimals, setMinterDecimals] = useState(0);
	const [sendingData, setSendingData] = useState(false);
	const [hasMinterRole, setHasMinterRole] = useState();
	const [rerender, setRerender] = useState(false);

	const getOfferData = useCallback(async () => {
		if (!contractData.product.offers) {
			return;
		}
		setOfferData(contractData.product.offers.map(item => {
			return {
				selected: !item.marketData.fromMarket,
				...item
			}
		}))
	}, [contractData])

	useEffect(() => {
		getOfferData()
	}, [getOfferData])

	const getContractData = useCallback(async () => {
		if (!diamondMarketplaceInstance) {
			return;
		}
		let nodeFeeData = await diamondMarketplaceInstance.getNodeFee()
		setNodeFee(Number(nodeFeeData.nodeFee.toString()));
		setMinterDecimals(nodeFeeData.decimals);
		let treasuryFeeData = await diamondMarketplaceInstance.getTreasuryFee();
		setTreasuryFee(Number(treasuryFeeData.treasuryFee.toString()));
		setTreasuryAddress(await diamondMarketplaceInstance.getTreasuryAddress());
		setHasMinterRole(
			await contractData.instance.hasRole(
				await contractData.instance.MINTER(),
				diamondMarketplaceInstance.address
			)
		)
	}, [diamondMarketplaceInstance, contractData.instance])

	useEffect(() => {
		getContractData()
	}, [getContractData])

	// let onMyChain = window.ethereum ?
	// 	chainData[contractData?.blockchain]?.chainId === window.ethereum.chainId
	// 	:
	// 	chainData[contractData?.blockchain]?.chainId === programmaticProvider.provider._network.chainId;
	
	useEffect(() => {
		setStepNumber(stepNumber);
	}, [setStepNumber, stepNumber])

	const setCustomFees = async e => {
		setSendingData(true);
		Swal.fire({
			title: 'Publishing offers on the marketplace',
			html: 'Please wait...',
			icon: 'info',
			showConfirmButton: false
		});
		let filteredOffers = offerData.filter(item => item.selected);
		if (await metamaskCall(
			diamondMarketplaceInstance.addMintingOfferBatch(
			//console.log(
				contractData.contractAddress,
				filteredOffers.map(item => item.rangeIndex),
				filteredOffers.map(item => item.customSplits.filter(split => split.editable)),
				filteredOffers.map(item => item.marketData.visible),
				process.env.REACT_APP_NODE_ADDRESS
			)
		)) {
			Swal.fire({
				title: 'Success',
				html: 'Offer(s) added to the marketplace',
				icon: 'success',
				showConfirmButton: true
			});
		}
		setSendingData(false)
	}
	
	const giveMinterRole = async () => {
		setSendingData(true);
		Swal.fire({
			title: 'Granting minter role',
			html: 'Please wait...',
			icon: 'info',
			showConfirmButton: false
		});
		if (await metamaskCall(contractData.instance.grantRole(
			await contractData.instance.MINTER(),
			diamondMarketplaceInstance.address
		))) {
			Swal.fire({
				title: 'Success',
				html: 'Custom fees set',
				icon: 'success',
				showConfirmButton: false
			});
			getContractData();
		}
		setSendingData(false);
	}

	return <div className='row px-0 mx-0'>
		{treasuryAddress !== undefined && offerData && offerData.map((item, index, array) => {
			return <MarketplaceOfferConfig key={index} {
				...{
					array,
					index,
					nodeFee,
					minterDecimals,
					treasuryFee,
					treasuryAddress,
					simpleMode,
					rerender: () => setRerender(!rerender)
				}} />
		})}
		{chainData && treasuryAddress && <FixedBottomNavigation
				backwardFunction={() => {
					history.goBack()
				}}
				forwardFunctions={[{
					label: hasMinterRole ? 'Put selected ranges up for sale!' : 'Approve the marketplace as a Minter!',
					action: hasMinterRole ? setCustomFees : giveMinterRole,
					disabled: sendingData || hasMinterRole === undefined || offerData.filter(item => item.selected === true).length === 0
				},{
					label: 'Continue',
					action: gotoNextStep,
					disabled: sendingData,
				}]}
			/>}
	</div>
};

const ContextWrapper = (props) => {
	return <WorkflowContext.Consumer> 
		{(value) => {
			return <DiamondMinterMarketplace {...value} {...props} />
		}}
	</WorkflowContext.Consumer>
}

export default ContextWrapper;