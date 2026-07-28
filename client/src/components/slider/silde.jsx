import React, { Fragment } from 'react'

import { StartSlider } from '../../until/slideshow';

export default function Silde() {
 StartSlider();

  return (
    <Fragment>
       <section class="homepage-banner">
            <section>
                <div class="banner-slide"> 
                    <img  class="slide-img" src="../Images/slide.PNG" alt="slide" />
                    <img  class="slide-img" src="../Images/banner-1.jpeg" alt="slide"/>
                    <img  class="slide-img" src="../Images/Banner6.png" alt="slide"/>
                    <img  class="slide-img" src="../Images/banner-3.jpg" alt="slide"/>
                    <img  class="slide-img" src="../Images/banner-4.jpeg" alt="slide"/>
                </div>
            </section>
        </section>
    </Fragment>
  )
}

