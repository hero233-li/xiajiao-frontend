import { useNavigate,useSearchParams } from 'react-router-dom';
import { localToday,useFitnessDay,type Models } from '../../api/fitness';
import { FitnessEditor,type Editable } from './Editor';
import { State } from './display';
export function FitnessEditPage({kind}: {kind:Editable}) {
 const [params]=useSearchParams(); const navigate=useNavigate(); const date=params.get('date') || localToday(); const day=useFitnessDay(date);
 const back=params.get('back') || '/fitness';
 if(!['training-plan','training','meal-plan','meals'].includes(kind)) return <p>编辑类型不存在。</p>;
 return <main id="main-content" className="platform-main" tabIndex={-1}><State loading={day.isPending} error={day.error} retry={day.refetch}>{day.data && <FitnessEditor page spec={{kind,key:date,entry:day.data.records[kind],initial:params.get('copy') === '1' && kind === 'training' && day.data.records['training-plan']?.data ? {status:'',exercises:day.data.records['training-plan'].data.exercises.map(e=>({...e,completed:false})),note:null,planSnapshot:null} as unknown as Models['training'] : params.get('copy') === '1' && kind === 'meals' ? structuredClone(day.data.records['meal-plan']?.data ?? {foods:[],note:null}) : undefined}} onClose={()=>navigate(`${back.startsWith('/fitness') && !back.startsWith('//')?back:'/fitness'}?date=${date}`)}/>}</State></main>;
}
