import { useState } from 'react'
import './App.css'
import FaceDetection from './FaceDetection'

function App() {
  const [appTitle] = useState('Advanced Face Detection System');
  
  return (
    <div className='App'>
      <FaceDetection title={appTitle} />
    </div>    
  )
}

export default App
